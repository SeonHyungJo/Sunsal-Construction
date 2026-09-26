import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { getComplex, searchComplexes } from "./complexes.ts";
import { throttle } from "./kapt.ts";
import { syncBasis, syncList } from "./sync.ts";
import { testD1 } from "./test-d1.ts";

const reply = (body: unknown) =>
  new Response(JSON.stringify({ response: { header: { resultCode: "00" }, body } }));
const gatewayHttpError = () =>
  new Response(
    JSON.stringify({
      OpenAPI_ServiceResponse: { cmmMsgHeader: { errMsg: "HTTP_ERROR", returnReasonCode: "04" } },
    }),
  );

beforeEach(() => {
  throttle.intervalMs = 0;
});
afterEach(() => vi.unstubAllGlobals());

test("목록 → 기본정보 수집, 검색 색인 갱신", async () => {
  const db = testD1();
  vi.stubGlobal("fetch", async () =>
    reply({
      totalCount: 2,
      items: [
        { kaptCode: "T1", kaptName: "가나아파트" },
        { kaptCode: "T2", kaptName: "다라아파트" },
      ],
    }),
  );
  await syncList(db, "k");
  expect((await searchComplexes(db, "가나아파트")).map((c) => c.kaptCode)).toEqual(["T1"]);

  vi.stubGlobal("fetch", async (u: string) => {
    const code = new URL(u).searchParams.get("kaptCode");
    return reply({
      item: {
        kaptCode: code,
        kaptName: code === "T1" ? "가나아파트" : "다라아파트",
        doroJuso: `서울특별시 테스트로 ${code}`,
        kaptBcompany: "(주)라인건설",
        kaptUsedate: "20200101",
      },
    });
  });
  await syncBasis(db, "k", 10);
  expect(await getComplex(db, "T1")).toMatchObject({
    roadAddress: "서울특별시 테스트로 T1",
    builderRaw: "(주)라인건설",
    approvalDate: "2020-01-01",
  });
  expect((await searchComplexes(db, "테스트로 T2")).map((c) => c.kaptCode)).toEqual(["T2"]);

  // 기본정보를 받은 단지는 목록 재수집이 이름을 덮어쓰지 않는다
  vi.stubGlobal("fetch", async () =>
    reply({ totalCount: 1, items: [{ kaptCode: "T1", kaptName: "목록이름" }] }),
  );
  await syncList(db, "k");
  expect((await getComplex(db, "T1"))?.name).toBe("가나아파트");
});

test("호출 제한이면 회차를 멈추고 해당 단지는 다음 회차에 먼저", async () => {
  const db = testD1();
  vi.stubGlobal("fetch", async () =>
    reply({
      totalCount: 3,
      items: ["A", "B", "C"].map((k) => ({ kaptCode: k, kaptName: k + "단지" })),
    }),
  );
  await syncList(db, "k");

  let calls = 0;
  vi.stubGlobal("fetch", async (u: string) => {
    calls++;
    const code = new URL(u).searchParams.get("kaptCode");
    return code === "B"
      ? gatewayHttpError()
      : reply({ item: { kaptCode: code, kaptName: code + "단지" } });
  });
  await syncBasis(db, "k", 3);
  expect(calls).toBe(2); // A 성공, B에서 멈춤, C는 호출 안 함
  expect((await getComplex(db, "A"))?.syncedAt).not.toBeNull();

  const next = (await db
    .prepare(
      "SELECT kapt_code FROM complexes ORDER BY attempted_at IS NOT NULL, attempted_at LIMIT 1",
    )
    .first<{ kapt_code: string }>())!;
  expect(["B", "C"]).toContain(next.kapt_code);
});

test("일반 실패는 오류만 기록하고 기존 값 유지", async () => {
  const db = testD1();
  vi.stubGlobal("fetch", async () =>
    reply({ totalCount: 1, items: [{ kaptCode: "X", kaptName: "엑스단지" }] }),
  );
  await syncList(db, "k");
  vi.stubGlobal("fetch", async () =>
    reply({ item: { kaptCode: "X", kaptName: "엑스단지", kaptBcompany: "원래시공사" } }),
  );
  await syncBasis(db, "k");
  vi.stubGlobal("fetch", async () => new Response("<xml>SERVICE ERROR</xml>"));
  await syncBasis(db, "k");
  expect(await getComplex(db, "X")).toMatchObject({ builderRaw: "원래시공사" });
  const row = await db
    .prepare("SELECT error FROM complexes WHERE kapt_code = 'X'")
    .first<{ error: string }>();
  expect(row?.error).toMatch(/non-JSON/);
});
