import { normalizeCompanyName as n } from "@sunsal/data";
import { expect, test } from "vitest";
import { matchBuilder } from "./match.ts";

const ranked = new Set(
  ["(주)라인", "(주)대우건설", "에이치엘디앤아이한라(주)", "신동아건설(주)"].map(n),
);
const aliases = new Map([
  [n("(주)라인건설"), n("(주)라인")],
  [n("HL디앤아이한라(주)"), n("에이치엘디앤아이한라(주)")],
]);
const m = (raw: string | null) => matchBuilder(raw, ranked, aliases);

test.each([
  ["주식회사 대우건설", { status: "listed", companyKey: "대우건설" }],
  ["㈜ 신동아건설", { status: "listed", companyKey: "신동아건설" }],
  ["(주)라인건설", { status: "listed", companyKey: "라인" }],
  ["HL디앤아이한라", { status: "listed", companyKey: "에이치엘디앤아이한라" }],
  ["삼성물산(주)", { status: "not_listed" }],
  ["대우", { status: "needs_review", reason: "similar_name" }],
  ["라인산업", { status: "needs_review", reason: "similar_name" }],
  ["(주)대우건설, 삼성물산(주)", { status: "needs_review", reason: "multiple_builders" }],
  ["대우건설 외 2개사", { status: "needs_review", reason: "multiple_builders" }],
  ["", { status: "unknown" }],
  [null, { status: "unknown" }],
] as const)("%s", (raw, expected) => {
  expect(m(raw)).toEqual(expected);
});
