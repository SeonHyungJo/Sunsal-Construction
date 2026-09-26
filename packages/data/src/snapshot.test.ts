import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { normalizeCompanyName } from "./company.ts";
import { parseAliases, parseAnnouncement } from "./snapshot.ts";

const dir = new URL("../data/", import.meta.url);
const read = (p: string) => JSON.parse(readFileSync(new URL(p, dir), "utf8"));
const files = readdirSync(new URL("announcements/", dir));

test.each(files)("%s: 20위 이내, 회사 중복 없음", (file) => {
  const a = parseAnnouncement(read(`announcements/${file}`));
  expect(a.rows.length).toBeGreaterThanOrEqual(20); // 20위 동률이면 더 많을 수 있다
  expect(Math.max(...a.rows.map((r) => r.rank))).toBeLessThanOrEqual(20);
  expect(new Set(a.rows.map((r) => normalizeCompanyName(r.companyName))).size).toBe(a.rows.length);
});

// 각 보도자료 본문에 적힌 상위 5개사(세부 하자수) — 원문 대조
test.each([
  [
    "2023-h2",
    [
      ["지에스건설(주)", 93],
      ["(주)상명종합건설", 80],
      ["건곤(주)", 65],
      ["에쓰와이이앤씨(주)", 62],
      ["대양종합건설(주)", 46],
    ],
  ],
  [
    "2024-h1",
    [
      ["(주)대송", 246],
      ["현대엔지니어링(주)", 109],
      ["지브이종합건설", 85],
      ["(주)태영건설", 76],
      ["주식회사플러스건설", 76],
    ],
  ],
  [
    "2024-h2",
    [
      ["현대엔지니어링(주)", 118],
      ["재현건설산업(주)", 92],
      ["지브이종합건설", 82],
      ["라임종합건설(주)", 76],
      ["삼도종합건설(주)", 71],
    ],
  ],
  [
    "2025-h1",
    [
      ["(주)한화", 97],
      ["현대건설(주)", 81],
      ["대우조선해양건설(주)", 80],
      ["한경기건(주)", 79],
      ["삼부토건(주)", 71],
    ],
  ],
  [
    "2025-h2",
    [
      ["(주)에이치제이중공업", 154],
      ["제일건설(주)", 135],
      ["(주)순영종합건설", 119],
      ["(주)대우건설", 82],
      ["혜우이엔씨(주)", 71],
    ],
  ],
] as const)("%s 상위 5개사 원문 대조", (id, top5) => {
  const a = parseAnnouncement(read(`announcements/${id}.json`));
  expect(a.rows.slice(0, 5).map((r) => [r.companyName, r.defectCount])).toEqual(top5);
});

test("2026-h1 원문 대조 (보도자료 본문 상위 5개사)", () => {
  const a = parseAnnouncement(read("announcements/2026-h1.json"));
  expect(a.rows.slice(0, 5).map((r) => [r.companyName, r.defectCount])).toEqual([
    ["(주)순영종합건설", 249],
    ["신동아건설(주)", 120],
    ["(주)빌텍종합건설", 66],
    ["(주)라인", 56],
    ["에스지건설(주)", 55],
  ]);
});

test("21위 이하·공동 순위 오류를 거부", () => {
  const a = read("announcements/2026-h1.json");
  expect(() =>
    parseAnnouncement({ ...a, rows: [...a.rows, { ...a.rows[19], rank: 21, companyName: "x" }] }),
  ).toThrow();
  expect(() =>
    parseAnnouncement({
      ...a,
      rows: a.rows.map((r: { rank: number }, i: number) => (i === 7 ? { ...r, rank: 8 } : r)),
    }),
  ).toThrow();
});

test("별칭은 스냅샷에 있는 회사만 가리킨다", () => {
  const keys = new Set(
    files.flatMap((f) => {
      const a = parseAnnouncement(read(`announcements/${f}`));
      return [...a.rows, ...(a.cumulative?.rows ?? [])].map((r) =>
        normalizeCompanyName(r.companyName),
      );
    }),
  );
  for (const x of parseAliases(read("builder-aliases.json")))
    expect(keys).toContain(normalizeCompanyName(x.company));
});

test("normalizeCompanyName", () => {
  expect(normalizeCompanyName("㈜라인")).toBe(normalizeCompanyName("(주) 라인"));
  expect(normalizeCompanyName("주식회사 대우건설")).toBe("대우건설");
  expect(normalizeCompanyName("hl디앤아이한라(주)")).toBe("HL디앤아이한라");
});

test("2026-h1 5년 누계: 20개사, 원문 상위 5개사", () => {
  const a = parseAnnouncement(read("announcements/2026-h1.json"));
  expect(a.cumulative?.rows).toHaveLength(20);
  expect(a.cumulative!.rows.slice(0, 5).map((r) => [r.companyName, r.defectCount])).toEqual([
    ["(주)순영종합건설", 383],
    ["(주)대명종합건설", 318],
    ["에스엠상선(주)", 311],
    ["제일건설(주)", 299],
    ["(주)대우건설", 293],
  ]);
});
