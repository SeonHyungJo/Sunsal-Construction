import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { normalizeCompanyName } from "./company.ts";
import { parseAliases, parseAnnouncement } from "./snapshot.ts";

const dir = new URL("../data/", import.meta.url);
const read = (p: string) => JSON.parse(readFileSync(new URL(p, dir), "utf8"));
const files = readdirSync(new URL("announcements/", dir));

test.each(files)("%s: 1~20위 원문 규칙", (file) => {
  const a = parseAnnouncement(read(`announcements/${file}`));
  expect(a.rows).toHaveLength(20);
  expect(new Set(a.rows.map((r) => normalizeCompanyName(r.companyName))).size).toBe(20);
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
