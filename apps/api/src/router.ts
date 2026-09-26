import { implement } from "@orpc/server";
import { contract } from "@sunsal/contract";
import { matchRules, ranking } from "@sunsal/data";
import { matchBuilder } from "./match.ts";
import { getComplex, hasComplexes, searchComplexes } from "./complexes.ts";
import { corrections } from "./store.ts";
import { sendTelegram } from "./telegram.ts";

type Context = {
  env: Env;
  ip: string;
  authorization: string | undefined;
  waitUntil: (p: Promise<unknown>) => void;
};
const os = implement(contract).$context<Context>();

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;
type RankRow = (typeof ranking.rows)[number];
const index = (rows: RankRow[]) => ({
  keys: new Set(rows.map((r) => r.companyKey)),
  byKey: new Map(rows.map((r) => [r.companyKey, r])),
});
const recent = index(ranking.rows);
const cumulative = ranking.cumulative && index(ranking.cumulative.rows);

function match(builderRaw: string | null, list: ReturnType<typeof index>) {
  const m = matchBuilder(builderRaw, list.keys, matchRules);
  return m.status === "listed"
    ? { status: "listed" as const, company: toCompany(list.byKey.get(m.companyKey)!) }
    : m;
}

const toCompany = (r: RankRow) => ({
  rank: r.rank,
  companyName: r.companyName,
  companyDefectCount: r.defectCount,
  companyCaseCount: r.caseCount,
  note: r.note,
});

/** 동·호수 같은 상세 주소는 검색에 필요 없고 개인정보라 버린다. */
export function normalizeQuery(q: string) {
  return q
    .normalize("NFKC")
    .replace(/\d+\s*동\s*\d+\s*호|\d+\s*호/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function isAdmin({ env, authorization }: Context) {
  if (!env.ADMIN_TOKEN || !authorization) return false;
  const digest = (s: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  const [a, b] = await Promise.all([digest(authorization), digest(`Bearer ${env.ADMIN_TOKEN}`)]);
  return crypto.subtle.timingSafeEqual(a, b);
}

export const router = os.router({
  health: os.health.handler(() => ({ ok: true as const })),

  ranking: {
    latest: os.ranking.latest.handler(() => ({
      announcement: ranking.announcement,
      companies: ranking.rows.map(toCompany),
      cumulative: ranking.cumulative && {
        periodStart: ranking.cumulative.periodStart,
        periodEnd: ranking.cumulative.periodEnd,
        companies: ranking.cumulative.rows.map(toCompany),
      },
    })),
  },

  complex: {
    search: os.complex.search.handler(async ({ input, context, errors }) => {
      const db = context.env.DB;
      const q = normalizeQuery(input.q);
      if (q.length < 2) return { status: "too_short" as const };
      if (!(await context.env.SEARCH_LIMITER.limit({ key: context.ip })).success)
        throw errors.RATE_LIMITED();
      const found = await searchComplexes(db, q);
      if (!found.length && !(await hasComplexes(db))) return { status: "not_ready" as const };
      const items = found.map((c) => ({
        kaptCode: c.kaptCode,
        name: c.name,
        roadAddress: c.roadAddress,
        legalAddress: c.legalAddress,
        approvalDate: c.approvalDate,
      }));
      return { status: "ok" as const, items };
    }),

    result: os.complex.result.handler(async ({ input, context, errors }) => {
      const c = await getComplex(context.env.DB, input.kaptCode);
      if (!c) throw errors.NOT_FOUND();
      const syncedAt = c.syncedAt ? new Date(c.syncedAt) : null;
      return {
        complex: {
          kaptCode: c.kaptCode,
          name: c.name,
          roadAddress: c.roadAddress,
          legalAddress: c.legalAddress,
          approvalDate: c.approvalDate,
          builderRaw: c.builderRaw,
        },
        match: match(c.builderRaw, recent),
        cumulative: cumulative && {
          periodStart: ranking.cumulative!.periodStart,
          periodEnd: ranking.cumulative!.periodEnd,
          match: match(c.builderRaw, cumulative),
        },
        announcement: ranking.announcement,
        complexDataSyncedAt: c.syncedAt,
        complexDataStale: !syncedAt || Date.now() - syncedAt.getTime() > STALE_AFTER_MS,
      };
    }),
  },

  correction: {
    create: os.correction.create.handler(async ({ input, context, errors }) => {
      if (!(await context.env.CORRECTION_LIMITER.limit({ key: context.ip })).success)
        throw errors.RATE_LIMITED();
      const c = await corrections.create(context.env.STORE, input);
      // 본문·연락처는 알림에 싣지 않는다.
      context.waitUntil(
        sendTelegram(
          context.env,
          `순살시공 정정 요청 접수: ${c.kind} ${c.kaptCode ?? ""} (${c.id})`,
        ),
      );
      return { id: c.id };
    }),

    get: os.correction.get.handler(async ({ input, context, errors }) => {
      const c = await corrections.get(context.env.STORE, input.id);
      if (!c) throw errors.NOT_FOUND();
      return c;
    }),

    log: os.correction.log.handler(({ context }) => corrections.log(context.env.STORE)),

    review: os.correction.review.handler(async ({ input, context, errors }) => {
      if (!(await isAdmin(context))) throw errors.UNAUTHORIZED();
      const c = await corrections.review(
        context.env.STORE,
        input.id,
        input.status,
        input.resolution,
      );
      if (!c) throw errors.NOT_FOUND();
      return c;
    }),
  },
});
