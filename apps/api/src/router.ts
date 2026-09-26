import { implement } from "@orpc/server";
import { contract } from "@sunsal/contract";
import { aliases, complexes, type ComplexDataset, ranking, sampleComplexes } from "@sunsal/data";
import { matchBuilder } from "./match.ts";
import { createSearch } from "./search.ts";
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
const rankedKeys = new Set(ranking.rows.map((r) => r.companyKey));
const byCompanyKey = new Map(ranking.rows.map((r) => [r.companyKey, r]));

const toCompany = (r: (typeof ranking.rows)[number]) => ({
  rank: r.rank,
  companyName: r.companyName,
  companyDefectCount: r.defectCount,
  companyCaseCount: r.caseCount,
  note: r.note,
});

function indexDataset(data: ComplexDataset) {
  return {
    data,
    byCode: new Map(data.items.map((c) => [c.kaptCode, c])),
    search: createSearch(data.items),
  };
}
// 운영 데이터는 Worker 시작 시(전역) 색인해 요청 CPU 시간에 넣지 않는다. 샘플은 로컬 개발에서만 지연 생성.
const live = indexDataset(complexes);
let sample: ReturnType<typeof indexDataset> | undefined;
const dataset = (env: Env) =>
  env.DATA_MODE === "sample" ? (sample ??= indexDataset(sampleComplexes)) : live;

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
    })),
  },

  complex: {
    search: os.complex.search.handler(async ({ input, context, errors }) => {
      const d = dataset(context.env);
      if (d.data.items.length === 0) return { status: "not_ready" as const };
      const q = normalizeQuery(input.q);
      if (q.length < 2) return { status: "too_short" as const };
      if (!(await context.env.SEARCH_LIMITER.limit({ key: context.ip })).success)
        throw errors.RATE_LIMITED();
      const items = d.search(q).map((c) => ({
        kaptCode: c.kaptCode,
        name: c.name,
        roadAddress: c.roadAddress,
        legalAddress: c.legalAddress,
        approvalDate: c.approvalDate,
      }));
      return { status: "ok" as const, items };
    }),

    result: os.complex.result.handler(({ input, context, errors }) => {
      const c = dataset(context.env).byCode.get(input.kaptCode);
      if (!c) throw errors.NOT_FOUND();
      const m = matchBuilder(c.builderRaw, rankedKeys, aliases);
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
        match:
          m.status === "listed"
            ? { status: "listed" as const, company: toCompany(byCompanyKey.get(m.companyKey)!) }
            : m,
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
