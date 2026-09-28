import { expect, test } from "vitest";
import { builderKey, builderNames, namesForKey } from "./builders.ts";
import { builderComplexes, searchBuilderNames } from "./complexes.ts";
import { testD1 } from "./test-d1.ts";

test("builderNames: 공동시공은 회사마다, 회사명 안의 &·법인 표기·꼬리말은 정리", () => {
  expect(builderNames("현대건설(주)")).toEqual(["현대건설"]);
  expect(builderNames("DL E&C")).toEqual(["DLE&C"]);
  expect(builderNames("지에스건설 주식회사, 주식회사 포스코건설, 현대건설 주식회사")).toEqual([
    "지에스건설",
    "포스코건설",
    "현대건설",
  ]);
  expect(builderNames("호반건설/태영건설")).toEqual(["호반건설", "태영건설"]);
  expect(builderNames("한일건설 외")).toEqual(["한일건설"]);
  expect(builderNames("(주)건양이엔지 외5")).toEqual(["건양이엔지"]);
  expect(builderNames("현대아산(주), 신성건설(주) 등")).toEqual(["현대아산", "신성건설"]);
  expect(builderNames("대우건설컨소시엄")).toEqual(["대우건설"]);
  expect(builderNames("미상")).toEqual([]);
  expect(builderNames(null)).toEqual([]);
});

test("별칭은 발표 회사 키로 모인다", () => {
  expect(builderKey("라인건설")).toBe("라인");
  expect(namesForKey("라인")).toContain("라인건설");
});

test("건설사 단지 목록: 사용승인 최신순, 날짜 없는 단지는 뒤로 / 이름 검색", async () => {
  const db = testD1();
  const rows = [
    ["C1", "옛단지", "2001-01-01", "현대건설"],
    ["C2", "새단지", "2024-05-01", "현대건설"],
    ["C3", "미정단지", null, "현대건설"],
    ["C4", "공동단지", "2010-01-01", "현대건설, GS건설"],
  ] as const;
  await db.batch(
    rows.flatMap(([code, name, date, raw]) => [
      db
        .prepare(
          "INSERT INTO complexes (kapt_code, name, approval_date, builder_raw, listed_at, search_text) VALUES (?, ?, ?, ?, '', ?)",
        )
        .bind(code, name, date, raw, name),
      ...builderNames(raw).map((n) =>
        db.prepare("INSERT INTO complex_builders (name, kapt_code) VALUES (?, ?)").bind(n, code),
      ),
    ]),
  );
  const page = await builderComplexes(db, ["현대건설"], 2, 0);
  expect(page.total).toBe(4);
  expect(page.items.map((c) => c.kaptCode)).toEqual(["C2", "C4"]);
  expect((await builderComplexes(db, ["현대건설"], 10, 2)).items.map((c) => c.kaptCode)).toEqual([
    "C1",
    "C3",
  ]);
  expect(await searchBuilderNames(db, "건설")).toEqual([
    { name: "현대건설", n: 4 },
    { name: "GS건설", n: 1 },
  ]);
});
