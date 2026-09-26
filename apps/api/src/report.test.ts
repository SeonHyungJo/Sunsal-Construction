import { expect, test, vi } from "vitest";
import { fakeKv } from "./test-kv.ts";
import { parseAdsense, parseGa4 } from "./google.ts";
import { buildReport, sendDailyReport, yesterdayKst } from "./report.ts";

test("yesterdayKst: KST 자정 경계", () => {
  expect(yesterdayKst(new Date("2026-09-26T01:00:00Z"))).toBe("2026-09-25"); // KST 10:00
  expect(yesterdayKst(new Date("2026-09-25T15:30:00Z"))).toBe("2026-09-25"); // KST 9/26 00:30
});

const ga = parseGa4([
  { rows: [{ metricValues: [{ value: "1234" }, { value: "1500" }] }] },
  {
    rows: [
      { dimensionValues: [{ value: "address_search_start" }], metricValues: [{ value: "400" }] },
      { dimensionValues: [{ value: "result_view" }], metricValues: [{ value: "150" }] },
    ],
  },
  {
    rows: [
      { dimensionValues: [{ value: "(not set)" }], metricValues: [{ value: "90" }] },
      { dimensionValues: [{ value: "ig_top5_0925" }], metricValues: [{ value: "60" }] },
    ],
  },
]);

const ads = parseAdsense({
  headers: [
    { name: "ESTIMATED_EARNINGS", currencyCode: "KRW" },
    { name: "PAGE_VIEWS" },
    { name: "IMPRESSIONS" },
    { name: "CLICKS" },
    { name: "PAGE_VIEWS_RPM", currencyCode: "KRW" },
  ],
  totals: {
    cells: [
      { value: "3210.5" },
      { value: "2000" },
      { value: "5100" },
      { value: "12" },
      { value: "1605" },
    ],
  },
});

test("parseGa4 / parseAdsense", () => {
  expect(ga).toEqual({
    activeUsers: 1234,
    sessions: 1500,
    searchStarts: 400,
    complexSelected: 0,
    resultViews: 150,
    socialSessions: 150,
    topSocialCampaign: "ig_top5_0925",
  });
  expect(ads).toMatchObject({
    estimatedEarnings: 3210.5,
    pageViews: 2000,
    clicks: 12,
    currency: "KRW",
  });
});

test("buildReport: 양쪽 성공", () => {
  expect(buildReport("2026-09-25", { ok: true, data: ga }, { ok: true, data: ads }))
    .toMatchInlineSnapshot(`
    "순살시공 · 9/25 일간 리포트
    방문자 1,234명 · 세션 1,500회
    주소 검색 시작 400회 → 단지 선택 0회 → 결과 열람 150회
    SNS 유입 150회 (상위 캠페인: ig_top5_0925)
    AdSense 추정 수익 3,210.50원 · 광고 페이지뷰 2,000회
    노출 5,100 · 클릭 12 · 페이지 RPM 1,605
    데이터 기준: GA4 / AdSense, 2026-09-25 전일 집계 (수익은 확정 지급액이 아닌 추정치)"
  `);
});

test("buildReport: 한쪽 실패는 0이 아니라 실패로 표시", () => {
  const text = buildReport("2026-09-25", { ok: true, data: ga }, { ok: false, error: "HTTP 403" });
  expect(text).toContain("AdSense: 수집 실패");
  expect(text).not.toContain("추정 수익 0");
  expect(
    buildReport("2026-09-25", { ok: false, error: "미설정" }, { ok: true, data: ads }),
  ).toContain("GA4: 미설정");
});

test("sendDailyReport: 같은 날은 한 번만 발송", async () => {
  const kv = fakeKv();
  const base = { STORE: kv } as unknown as Env;
  const now = new Date("2026-09-26T01:00:00Z");

  // Telegram 미설정 → 발송 안 됨, 기록만
  expect((await sendDailyReport(base, now)).status).toBe("not_configured");

  let sends = 0;
  vi.stubGlobal("fetch", async () => {
    sends++;
    return new Response("{}");
  });
  const env = { ...base, TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "c" } as Env;
  expect(await sendDailyReport(env, now)).toMatchObject({ status: "sent", attempts: 2 });
  await sendDailyReport(env, new Date("2026-09-26T01:30:00Z")); // 10:30 재시도 cron
  expect(sends).toBe(1);
  vi.unstubAllGlobals();
});
