// 로컬 Supabase(`supabase start` + `pnpm db:migrate`)가 필요하다. DATABASE_URL이 없으면 건너뛴다.
import { complexes, createDb, syncRuns } from "@sunsal/db";
import { and, eq, inArray, isNull, like, notLike } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { syncBasis, syncList } from "./sync.ts";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("K-apt sync (DB)", () => {
  const db = createDb(url!);
  const reply = (body: unknown) =>
    new Response(JSON.stringify({ response: { header: { resultCode: "00" }, body } }));
  const get = (code: string) =>
    db
      .select()
      .from(complexes)
      .where(eq(complexes.kaptCode, code))
      .then((r) => r[0]!);

  // 순환 대상은 시도 이력이 없는 단지가 먼저다. 샘플 시드의 미수집 단지가 끼지 않게 테스트 동안만 시도 시각을 채운다.
  let parked: string[] = [];
  beforeAll(async () => {
    const rows = await db
      .update(complexes)
      .set({ basisAttemptedAt: new Date() })
      .where(and(isNull(complexes.basisAttemptedAt), notLike(complexes.kaptCode, "TEST%")))
      .returning({ code: complexes.kaptCode });
    parked = rows.map((r) => r.code);
  });
  beforeEach(() => db.delete(complexes).where(like(complexes.kaptCode, "TEST%")));
  afterAll(async () => {
    await db.delete(complexes).where(like(complexes.kaptCode, "TEST%"));
    if (parked.length)
      await db
        .update(complexes)
        .set({ basisAttemptedAt: null })
        .where(inArray(complexes.kaptCode, parked));
    await db.$client.end();
  });

  test("목록 upsert 후 기본정보 수집, 실패 시 기존 값 보존", async () => {
    vi.stubGlobal("fetch", async () =>
      reply({
        totalCount: 2,
        items: {
          item: [
            { kaptCode: "TEST0001", kaptName: "가" },
            { kaptCode: "TEST0002", kaptName: "나", as1: "서울특별시" },
          ],
        },
      }),
    );
    await syncList(db, "k");
    expect((await get("TEST0002")).sido).toBe("서울특별시");

    vi.stubGlobal("fetch", async (u: string) =>
      reply({
        item: {
          kaptCode: new URL(u).searchParams.get("kaptCode"),
          kaptName: "가",
          kaptBcompany: "(주)라인건설",
          kaptUsedate: "20200101",
        },
      }),
    );
    await db
      .update(complexes)
      .set({ basisAttemptedAt: new Date(0) })
      .where(like(complexes.kaptCode, "TEST%"));
    await syncBasis(db, "k", 2);
    const first = await get("TEST0001");
    expect(first).toMatchObject({
      builderRaw: "(주)라인건설",
      approvalDate: "2020-01-01",
      basisError: null,
    });
    expect(first.basisChangedAt).not.toBeNull();

    // 같은 값 재수집 → 변경 시각 유지
    await db
      .update(complexes)
      .set({ basisAttemptedAt: new Date(0) })
      .where(eq(complexes.kaptCode, "TEST0001"));
    await syncBasis(db, "k", 1);
    const second = await get("TEST0001");
    expect(second.basisChangedAt).toEqual(first.basisChangedAt);

    // API 실패 → 오류만 기록, 이전 검증 데이터는 그대로
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          "<OpenAPI_ServiceResponse>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</OpenAPI_ServiceResponse>",
        ),
    );
    await db
      .update(complexes)
      .set({ basisAttemptedAt: new Date(0) })
      .where(eq(complexes.kaptCode, "TEST0001"));
    await syncBasis(db, "k", 1);
    const after = await get("TEST0001");
    expect(after.builderRaw).toBe("(주)라인건설");
    expect(after.basisSyncedAt).toEqual(second.basisSyncedAt);
    expect(after.basisError).toMatch(/non-JSON/);

    const [run] = await db
      .select()
      .from(syncRuns)
      .orderBy(syncRuns.id)
      .then((r) => r.slice(-1));
    expect(run).toMatchObject({ job: "kapt_basis", failed: 1, ok: 0 });
  });
});
