import { dailyReports, type Db } from "@sunsal/db";
import { eq, sql } from "drizzle-orm";
import {
  type AdsenseDaily,
  fetchAdsenseDaily,
  fetchGa4Daily,
  type Ga4Daily,
  googleAccessToken,
  type Result,
} from "./google.ts";
import { sendTelegram } from "./telegram.ts";

/** now 기준 KST 전날 (YYYY-MM-DD) */
export function yesterdayKst(now: Date) {
  return new Date(now.getTime() + 9 * 3600_000 - 86_400_000).toISOString().slice(0, 10);
}

const num = (n: number) => n.toLocaleString("ko-KR");
const reason = (e: string) => (e === "미설정" ? "미설정" : "수집 실패");

/** GA4와 AdSense는 집계 기준이 달라 합산하지 않는다. 실패한 쪽은 0 대신 실패로 적는다. */
export function buildReport(date: string, ga: Result<Ga4Daily>, ads: Result<AdsenseDaily>) {
  const [, m, d] = date.split("-").map(Number);
  const lines = [`순살시공 · ${m}/${d} 일간 리포트`];

  if (ga.ok) {
    const g = ga.data;
    lines.push(
      `방문자 ${num(g.activeUsers)}명 · 세션 ${num(g.sessions)}회`,
      `주소 검색 시작 ${num(g.searchStarts)}회 → 단지 선택 ${num(g.complexSelected)}회 → 결과 열람 ${num(g.resultViews)}회`,
      `SNS 유입 ${num(g.socialSessions)}회${g.topSocialCampaign ? ` (상위 캠페인: ${g.topSocialCampaign})` : ""}`,
    );
  } else {
    lines.push(`GA4: ${reason(ga.error)}`);
  }

  if (ads.ok) {
    const a = ads.data;
    const won = a.estimatedEarnings.toLocaleString("ko-KR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    lines.push(
      `AdSense 추정 수익 ${won}${a.currency === "KRW" ? "원" : ` ${a.currency}`} · 광고 페이지뷰 ${num(a.pageViews)}회`,
      `노출 ${num(a.impressions)} · 클릭 ${num(a.clicks)} · 페이지 RPM ${num(a.pageViewsRpm)}`,
    );
  } else {
    lines.push(`AdSense: ${reason(ads.error)}`);
  }

  lines.push(`데이터 기준: GA4 / AdSense, ${date} 전일 집계 (수익은 확정 지급액이 아닌 추정치)`);
  return lines.join("\n");
}

/** 전일 리포트를 한 번만 보낸다. 10:00 실패 시 10:30 cron이 재시도한다. */
export async function sendDailyReport(db: Db, env: Env, now = new Date()) {
  const date = yesterdayKst(now);
  const [existing] = await db.select().from(dailyReports).where(eq(dailyReports.reportDate, date));
  if (existing?.status === "sent") return existing;

  const token = await googleAccessToken(env);
  const [ga, ads] = token.ok
    ? await Promise.all([
        fetchGa4Daily(token.data, env.GA4_PROPERTY_ID, date),
        fetchAdsenseDaily(token.data, env.ADSENSE_ACCOUNT_ID, date),
      ])
    : [token, token];
  if (!ga.ok && ga.error !== "미설정") console.error(`GA4 report failed: ${ga.error}`);
  if (!ads.ok && ads.error !== "미설정") console.error(`AdSense report failed: ${ads.error}`);

  const message = buildReport(date, ga, ads);
  const sent = await sendTelegram(env, message);
  const status = sent.ok ? "sent" : sent.error === "미설정" ? "not_configured" : "failed";
  if (!sent.ok && status === "failed") console.error(`Telegram send failed: ${sent.error}`);

  const [row] = await db
    .insert(dailyReports)
    .values({ reportDate: date, status, message, attempts: 1 })
    .onConflictDoUpdate({
      target: dailyReports.reportDate,
      set: { status, message, attempts: sql`${dailyReports.attempts} + 1`, updatedAt: sql`now()` },
    })
    .returning();
  return row!;
}
