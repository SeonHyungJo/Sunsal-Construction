import { implement } from "@orpc/server";
import { contract } from "@sunsal/contract";
import {
  announcements,
  builderAliases,
  complexes,
  complexSearchText,
  type Db,
  rankingRows,
} from "@sunsal/db";
import { desc, eq, sql } from "drizzle-orm";
import { matchBuilder } from "./match.ts";

type Context = { db: Db; env: Env; ip: string };
const os = implement(contract).$context<Context>();

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
});
