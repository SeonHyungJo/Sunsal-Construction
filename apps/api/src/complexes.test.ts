import { sampleComplexes, searchText } from "@sunsal/data";
import { beforeAll, expect, test } from "vitest";
import { getComplex, hasComplexes, searchComplexes } from "./complexes.ts";
import { afterApproval, normalizeQuery } from "./router.ts";
import { createSearch } from "./search.ts";
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

test('검색어의 "아파트"는 빼고, 순위도 단지명에서 뺀 이름으로 비교', async () => {
  expect(await codes(normalizeQuery("라인캐슬아파트"))).toEqual(["A90000001"]);
  expect(normalizeQuery("아파트")).toBe("");
  const c = (kaptCode: string, name: string) => ({ ...sampleComplexes.items[0]!, kaptCode, name });
  const search = createSearch([c("B", "형제타운"), c("A", "형제아파트")]);
  expect(search(normalizeQuery("형제아파트")).map((x) => x.kaptCode)).toEqual(["A", "B"]);
});

test("afterApproval: 사용승인 후 2년과 겹치는 반기 발표만, 오래된 순", () => {
  const r = afterApproval("지에스건설(주)", "2021-06-01"); // ~2023-06-01 → '23.3~8월 판정분만
  expect(r.map((a) => a.periodStart)).toEqual(["2023-03-01"]);
  expect(r[0]!.match).toMatchObject({ status: "listed", company: { rank: 1 } });
  expect(afterApproval("지에스건설(주)", "2024-01-01").map((a) => a.periodStart)).toEqual([
    "2023-09-01",
    "2024-03-01",
    "2024-09-01",
    "2025-03-01",
    "2025-09-01",
  ]);
  expect(afterApproval("지에스건설(주)", "2019-01-01")).toEqual([]); // 발표 자료 이전
  expect(afterApproval("지에스건설(주)", null)).toEqual([]);
});
