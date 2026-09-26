import { expect, test } from "vitest";
import { parseBasis } from "./kapt.ts";

test("parseBasis: API 응답 필드 → 단지 기본정보", () => {
  expect(
    parseBasis({
      kaptCode: "A10027875",
      kaptName: "테스트아파트",
      kaptAddr: "서울특별시 강남구 역삼동 1 테스트아파트",
      doroJuso: "서울특별시 강남구 테헤란로 1",
      kaptBcompany: " (주)대우건설 ",
      kaptAcompany: "",
      kaptUsedate: "20100131",
      kaptdaCnt: "1,024",
    }),
  ).toEqual({
    name: "테스트아파트",
    legalAddress: "서울특별시 강남구 역삼동 1 테스트아파트",
    roadAddress: "서울특별시 강남구 테헤란로 1",
    builderRaw: "(주)대우건설",
    developerRaw: null,
    approvalDate: "2010-01-31",
    households: 1024,
  });
});

test("parseBasis: 비어 있거나 형식이 다른 값은 null", () => {
  expect(
    parseBasis({ kaptCode: "A1", kaptName: "x", kaptUsedate: "2010", kaptdaCnt: 300 }),
  ).toMatchObject({
    approvalDate: null,
    households: 300,
    builderRaw: null,
  });
});
