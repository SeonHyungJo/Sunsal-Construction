import { aliases, normalizeCompanyName as n, ranking, reviewNames } from "@sunsal/data";
import { expect, test } from "vitest";
import { matchBuilder } from "./match.ts";

const ranked = new Set(ranking.rows.map((r) => r.companyKey));
const m = (raw: string | null) => matchBuilder(raw, ranked, aliases, reviewNames);

// 2026-09-26 K-apt 실수집 데이터에서 나온 표기
test.each([
  ["주식회사 대우건설", { status: "listed", companyKey: "대우건설" }],
  ["두산건설주식회사", { status: "listed", companyKey: "두산건설" }],
  ["(주)라인건설", { status: "listed", companyKey: "라인" }],
  ["HL 디앤아이한라", { status: "listed", companyKey: n("에이치엘디앤아이한라(주)") }],
  ["한라건설", { status: "listed", companyKey: n("에이치엘디앤아이한라(주)") }],
  ["에이치엘디앤디앤한라주식회사", { status: "listed", companyKey: n("에이치엘디앤아이한라(주)") }],
  ["삼성물산(주)", { status: "not_listed" }],
  ["GS건설", { status: "not_listed" }],
  ["(주)유림E&C", { status: "not_listed" }],
  ["한솔건설", { status: "not_listed" }],
  ["대우", { status: "needs_review", reason: "similar_name" }],
  ["신동아종합", { status: "needs_review", reason: "similar_name" }],
  ["금호산업개발주식회사", { status: "needs_review", reason: "similar_name" }],
  ["SG건설", { status: "needs_review", reason: "similar_name" }],
  ["(주)대우건설, 삼성물산(주)", { status: "needs_review", reason: "multiple_builders" }],
  ["(주)태왕 / (주)삼우", { status: "needs_review", reason: "multiple_builders" }],
  ["대우건설 외 2개사", { status: "needs_review", reason: "multiple_builders" }],
  ["확인안됨", { status: "unknown" }],
  ["추후 확인 후 입력 예정", { status: "unknown" }],
  ["건축물대장 내용 없음", { status: "unknown" }],
  ["722-73-00477", { status: "unknown" }],
  [".", { status: "unknown" }],
  [null, { status: "unknown" }],
] as const)("%s", (raw, expected) => {
  expect(m(raw)).toEqual(expected);
});
