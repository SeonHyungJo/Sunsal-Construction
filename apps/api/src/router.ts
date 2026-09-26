import { implement } from "@orpc/server";
import { contract, type correctionKinds, type correctionStatuses } from "@sunsal/contract";
import {
  announcements,
  builderAliases,
  complexes,
  complexSearchText,
  correctionRequests,
  type Db,
  rankingRows,
} from "@sunsal/db";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { matchBuilder } from "./match.ts";
import { sendTelegram } from "./telegram.ts";

type Context = {
  db: Db;
  env: Env;
  ip: string;
  authorization: string | undefined;
  waitUntil: (p: Promise<unknown>) => void;
};
const os = implement(contract).$context<Context>();

const toCorrection = (r: typeof correctionRequests.$inferSelect) => ({
  id: r.id,
  kind: r.kind as (typeof correctionKinds)[number],
  kaptCode: r.kaptCode,
  status: r.status as (typeof correctionStatuses)[number],
  resolution: r.resolution,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

async function isAdmin({ env, authorization }: Context) {
  if (!env.ADMIN_TOKEN || !authorization) return false;
  const digest = (s: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  const [a, b] = await Promise.all([digest(authorization), digest(`Bearer ${env.ADMIN_TOKEN}`)]);
  return crypto.subtle.timingSafeEqual(a, b);
}

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

async function latestRanking(db: Db) {
  const [announcement] = await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.publishedOn))
    .limit(1);
  if (!announcement) return null;
  const rows = await db
    .select()
    .from(rankingRows)
    .where(eq(rankingRows.announcementId, announcement.id))
    .orderBy(rankingRows.rank, rankingRows.companyName);
  return { announcement, rows };
}

const toCompany = (r: typeof rankingRows.$inferSelect) => ({
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

export const router = os.router({
  health: os.health.handler(() => ({ ok: true as const })),

  ranking: {
    latest: os.ranking.latest.handler(async ({ context }) => {
      const latest = await latestRanking(context.db);
      return latest && { announcement: latest.announcement, companies: latest.rows.map(toCompany) };
    }),
  },

  complex: {
    search: os.complex.search.handler(async ({ input, context, errors }) => {
      const q = normalizeQuery(input.q);
      if (q.length < 2) return { status: "too_short" as const };
      if (!(await context.env.SEARCH_LIMITER.limit({ key: context.ip })).success)
        throw errors.RATE_LIMITED();

      const text = complexSearchText(complexes);
      const items = await context.db
        .select({
          kaptCode: complexes.kaptCode,
          name: complexes.name,
          roadAddress: complexes.roadAddress,
          legalAddress: complexes.legalAddress,
          approvalDate: complexes.approvalDate,
        })
        .from(complexes)
        .where(sql`${q} <% (${text})`)
        .orderBy(sql`word_similarity(${q}, ${text}) desc`, complexes.name)
        .limit(10);
      return { status: "ok" as const, items };
    }),

    result: os.complex.result.handler(async ({ input, context, errors }) => {
      const { db } = context;
      const [complex] = await db
        .select()
        .from(complexes)
        .where(eq(complexes.kaptCode, input.kaptCode));
      if (!complex) throw errors.NOT_FOUND();

      const [latest, aliasRows] = await Promise.all([
        latestRanking(db),
        db.select().from(builderAliases),
      ]);
      const byKey = new Map(latest?.rows.map((r) => [r.companyKey, r]));
      const m = matchBuilder(
        complex.builderRaw,
        new Set(byKey.keys()),
        new Map(aliasRows.map((a) => [a.alias, a.companyKey])),
      );

      const syncedAt = complex.basisSyncedAt;
      return {
        complex: {
          kaptCode: complex.kaptCode,
          name: complex.name,
          roadAddress: complex.roadAddress,
          legalAddress: complex.legalAddress,
          approvalDate: complex.approvalDate,
          builderRaw: complex.builderRaw,
        },
        match:
          m.status === "listed"
            ? { status: "listed" as const, company: toCompany(byKey.get(m.companyKey)!) }
            : m,
        announcement: latest?.announcement ?? null,
        complexDataSyncedAt: syncedAt?.toISOString() ?? null,
        complexDataStale: !syncedAt || Date.now() - syncedAt.getTime() > STALE_AFTER_MS,
      };
    }),
  },

  correction: {
    create: os.correction.create.handler(async ({ input, context, errors }) => {
      if (!(await context.env.CORRECTION_LIMITER.limit({ key: context.ip })).success)
        throw errors.RATE_LIMITED();
      const [row] = await context.db
        .insert(correctionRequests)
        .values({
          kind: input.kind,
          kaptCode: input.kaptCode,
          message: input.message,
          contact: input.contact || null,
        })
        .returning({ id: correctionRequests.id });
      // 본문·연락처는 알림에 싣지 않는다.
      context.waitUntil(
        sendTelegram(
          context.env,
          `순살시공 정정 요청 접수: ${input.kind} ${input.kaptCode ?? ""} (${row!.id})`,
        ),
      );
      return { id: row!.id };
    }),

    get: os.correction.get.handler(async ({ input, context, errors }) => {
      const [row] = await context.db
        .select()
        .from(correctionRequests)
        .where(eq(correctionRequests.id, input.id));
      if (!row) throw errors.NOT_FOUND();
      return toCorrection(row);
    }),

    log: os.correction.log.handler(async ({ context }) => {
      const rows = await context.db
        .select()
        .from(correctionRequests)
        .where(inArray(correctionRequests.status, ["applied", "rejected"]))
        .orderBy(desc(correctionRequests.updatedAt))
        .limit(50);
      return rows.map(toCorrection);
    }),

    review: os.correction.review.handler(async ({ input, context, errors }) => {
      if (!(await isAdmin(context))) throw errors.UNAUTHORIZED();
      const [row] = await context.db
        .update(correctionRequests)
        .set({ status: input.status, resolution: input.resolution ?? null, updatedAt: sql`now()` })
        .where(eq(correctionRequests.id, input.id))
        .returning();
      if (!row) throw errors.NOT_FOUND();
      return toCorrection(row);
    }),
  },
});
