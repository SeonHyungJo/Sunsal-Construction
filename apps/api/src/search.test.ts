import { sampleComplexes } from "@sunsal/data";
import { expect, test } from "vitest";
import { createSearch } from "./search.ts";

const search = createSearch(sampleComplexes.items);
const codes = (q: string) => search(q).map((c) => c.kaptCode);

test("단지명·도로명 부분 일치, 공백 무시", () => {
  expect(codes("라인캐슬")).toEqual(["A90000001"]);
  expect(codes("광교중앙로100")).toEqual(["A90000001"]);
  expect(codes("테헤란로 300")).toEqual(["A90000003"]);
});

test("동명 단지는 모두 후보로", () => {
  expect(codes("샘플 래미안").sort()).toEqual(["A90000004", "A90000005"]);
});

test("띄어 쓴 단어는 모두 포함해야 한다", () => {
  expect(codes("래미안 해운대")).toEqual(["A90000005"]);
});

test("오타는 단지명 유사도로 후보", () => {
  expect(codes("샘플 라인캐쓸")).toContain("A90000001");
});

test("없는 주소는 빈 결과", () => {
  expect(codes("존재하지않는단지명")).toEqual([]);
});
