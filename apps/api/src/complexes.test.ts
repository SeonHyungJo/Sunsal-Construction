import { sampleComplexes, searchText } from "@sunsal/data";
import { beforeAll, expect, test } from "vitest";
import { getComplex, hasComplexes, searchComplexes } from "./complexes.ts";
import { testD1 } from "./test-d1.ts";

const db = testD1();
beforeAll(async () => {
  await db.batch(
    sampleComplexes.items.map((c) =>
      db
        .prepare(
          "INSERT INTO complexes (kapt_code, name, road_address, legal_address, builder_raw, approval_date, synced_at, listed_at, search_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          c.kaptCode,
          c.name,
          c.roadAddress,
          c.legalAddress,
          c.builderRaw,
          c.approvalDate,
          c.syncedAt,
          "2026-09-26",
          searchText(c),
        ),
    ),
  );
});

const codes = async (q: string) => (await searchComplexes(db, q)).map((c) => c.kaptCode);

test("FTS: 단지명·도로명(공백 무시)", async () => {
  expect(await codes("라인캐슬")).toEqual(["A90000001"]);
  expect(await codes("광교중앙로100")).toEqual(["A90000001"]);
  expect(await codes("테헤란로 300")).toEqual(["A90000003"]);
});

test("2글자 검색어는 LIKE로", async () => {
  expect((await codes("래미")).sort()).toEqual(["A90000004", "A90000005"]);
});

test("동명 단지·단어 조합", async () => {
  expect((await codes("샘플 래미안")).sort()).toEqual(["A90000004", "A90000005"]);
  expect(await codes("래미안 해운대")).toEqual(["A90000005"]);
});

test("오타는 trigram 후보 + 유사도", async () => {
  expect(await codes("샘플 라인캐쓸")).toContain("A90000001");
  expect(await codes("존재하지않는단지명")).toEqual([]);
});

test("단건 조회·존재 여부", async () => {
  expect(await getComplex(db, "A90000009")).toMatchObject({
    name: "샘플 한라비발디",
    builderRaw: "(주)한라",
  });
  expect(await getComplex(db, "A00000000")).toBeNull();
  expect(await hasComplexes(db)).toBe(true);
  expect(await hasComplexes(testD1())).toBe(false);
});
