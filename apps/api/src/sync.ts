import { complexes, correctionRequests, type Db, syncRuns } from "@sunsal/db";
import { and, asc, eq, inArray, lt, ne, sql } from "drizzle-orm";
import { type ComplexBasis, fetchBasis, fetchListPage } from "./kapt.ts";

async function recordRun(
  db: Db,
  job: string,
  run: () => Promise<{ ok: number; changed: number; failed: number }>,
) {
  const [{ id }] = (await db.insert(syncRuns).values({ job }).returning({ id: syncRuns.id })) as [
    { id: number },
  ];
  try {
    const counts = await run();
    await db
      .update(syncRuns)
      .set({ ...counts, finishedAt: new Date() })
      .where(eq(syncRuns.id, id));
  } catch (e) {
    await db
      .update(syncRuns)
      .set({ finishedAt: new Date(), error: String(e) })
      .where(eq(syncRuns.id, id));
    throw e;
  }
}

/** 전체 단지 목록을 받아 단지코드·이름·행정구역을 upsert한다. 목록에서 빠진 단지는 지우지 않는다. */
export function syncList(db: Db, serviceKey: string) {
  return recordRun(db, "kapt_list", async () => {
    let ok = 0;
    for (let page = 1; ; page++) {
      const { items, totalCount } = await fetchListPage(serviceKey, page);
      if (items.length === 0) break;
      await db
        .insert(complexes)
        .values(
          items.map((i) => ({
            kaptCode: i.kaptCode,
            name: i.kaptName,
            bjdCode: i.bjdCode ?? null,
            sido: i.as1 ?? null,
            sigungu: i.as2 ?? null,
            eupmyeondong: i.as3 ?? null,
          })),
        )
        .onConflictDoUpdate({
          target: complexes.kaptCode,
          set: {
            bjdCode: sql`excluded.bjd_code`,
            sido: sql`excluded.sido`,
            sigungu: sql`excluded.sigungu`,
            eupmyeondong: sql`excluded.eupmyeondong`,
            listedAt: sql`now()`,
          },
        });
      ok += items.length;
      if (ok >= totalCount) break;
    }
    return { ok, changed: 0, failed: 0 };
  });
}

const BASIS_FIELDS = [
  "name",
  "legalAddress",
  "roadAddress",
  "builderRaw",
  "developerRaw",
  "approvalDate",
  "households",
] as const;

/**
 * 가장 오래전에 시도한 단지부터 기본정보를 받는다. 실패하면 오류만 기록하고 기존 값은 그대로 둔다.
 * ponytail: 10분마다 25건 = 하루 3,600건. 개발계정 한도(5,000) 기준이며 운영계정 승인 후 batch를 올린다.
 */
export function syncBasis(db: Db, serviceKey: string, batch = 25) {
  return recordRun(db, "kapt_basis", async () => {
    const targets = await db
      .select()
      .from(complexes)
      .orderBy(sql`${complexes.basisAttemptedAt} asc nulls first`, asc(complexes.kaptCode))
      .limit(batch);

    let ok = 0,
      changed = 0,
      failed = 0,
      streak = 0;
    for (const c of targets) {
      const now = new Date();
      let basis: ComplexBasis;
      try {
        basis = await fetchBasis(serviceKey, c.kaptCode);
      } catch (e) {
        failed++;
        await db
          .update(complexes)
          .set({ basisAttemptedAt: now, basisError: String(e).slice(0, 500) })
          .where(eq(complexes.kaptCode, c.kaptCode));
        // 한도 초과·인증 오류처럼 전체가 실패하는 상황이면 호출을 낭비하지 않는다.
        if (++streak >= 3) break;
        continue;
      }
      streak = 0;
      ok++;
      if (!basis.name) basis.name = c.name;
      const isChanged = BASIS_FIELDS.some((f) => basis[f] !== c[f]);
      if (isChanged) changed++;
      await db
        .update(complexes)
        .set({
          ...basis,
          basisAttemptedAt: now,
          basisSyncedAt: now,
          basisError: null,
          ...(isChanged && { basisChangedAt: now }),
        })
        .where(eq(complexes.kaptCode, c.kaptCode));
    }
    return { ok, changed, failed };
  });
}

/** 처리 완료 1년이 지난 정정 요청의 본문·연락처를 지운다 (개인정보처리방침 보관 기간). */
const PURGED = "(보관 기간 경과로 삭제)";

export async function purgeOldCorrections(db: Db) {
  const rows = await db
    .update(correctionRequests)
    .set({ message: PURGED, contact: null })
    .where(
      and(
        inArray(correctionRequests.status, ["applied", "rejected"]),
        lt(correctionRequests.updatedAt, sql`now() - interval '1 year'`),
        ne(correctionRequests.message, PURGED),
      ),
    )
    .returning({ id: correctionRequests.id });
  if (rows.length) console.log(`purged corrections: ${rows.length}`);
}
