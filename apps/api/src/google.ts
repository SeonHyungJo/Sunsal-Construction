// GA4 Data API · AdSense Management API. 같은 Google 계정의 OAuth refresh token 하나로 두 API를 읽는다.
// scope: analytics.readonly, adsense.readonly

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type Ga4Daily = {
  activeUsers: number;
  sessions: number;
  searchStarts: number;
  complexSelected: number;
  resultViews: number;
  socialSessions: number;
  topSocialCampaign: string | null;
};

export type AdsenseDaily = {
  estimatedEarnings: number;
  pageViews: number;
  impressions: number;
  clicks: number;
  pageViewsRpm: number;
  currency: string;
};

type GoogleEnv = Pick<Env, "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "GOOGLE_REFRESH_TOKEN">;

export async function googleAccessToken(env: GoogleEnv): Promise<Result<string>> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN)
    return { ok: false, error: "미설정" };
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
    }),
  });
  if (!res.ok) return { ok: false, error: `OAuth HTTP ${res.status}` };
  return { ok: true, data: ((await res.json()) as { access_token: string }).access_token };
}

async function getJson(url: string, token: string, body?: unknown) {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<any>;
}

const FUNNEL_EVENTS = ["address_search_start", "complex_selected", "result_view"];

/** date: YYYY-MM-DD (GA4 속성 시간대 기준) */
export async function fetchGa4Daily(
  token: string,
  propertyId: string | undefined,
  date: string,
): Promise<Result<Ga4Daily>> {
  if (!propertyId) return { ok: false, error: "미설정" };
  try {
    const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`;
    const dateRanges = [{ startDate: date, endDate: date }];
    const { reports } = await getJson(url, token, {
      requests: [
        { dateRanges, metrics: [{ name: "activeUsers" }, { name: "sessions" }] },
        {
          dateRanges,
          dimensions: [{ name: "eventName" }],
          metrics: [{ name: "eventCount" }],
          dimensionFilter: {
            filter: { fieldName: "eventName", inListFilter: { values: FUNNEL_EVENTS } },
          },
        },
        {
          dateRanges,
          dimensions: [{ name: "sessionCampaignName" }],
          metrics: [{ name: "sessions" }],
          dimensionFilter: {
            filter: {
              fieldName: "sessionDefaultChannelGroup",
              inListFilter: { values: ["Organic Social", "Paid Social"] },
            },
          },
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        },
      ],
    });
    return { ok: true, data: parseGa4(reports) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

type Ga4Report = {
  rows?: { dimensionValues?: { value: string }[]; metricValues: { value: string }[] }[];
};

export function parseGa4([totals, events, social]: Ga4Report[]): Ga4Daily {
  const n = (v?: string) => Number(v ?? 0);
  const event = (name: string) =>
    n(events?.rows?.find((r) => r.dimensionValues?.[0]?.value === name)?.metricValues[0]?.value);
  const campaigns = (social?.rows ?? []).filter(
    (r) => !/^\((not set|direct|organic|referral)\)$/.test(r.dimensionValues?.[0]?.value ?? ""),
  );
  return {
    activeUsers: n(totals?.rows?.[0]?.metricValues[0]?.value),
    sessions: n(totals?.rows?.[0]?.metricValues[1]?.value),
    searchStarts: event("address_search_start"),
    complexSelected: event("complex_selected"),
    resultViews: event("result_view"),
    socialSessions: (social?.rows ?? []).reduce((sum, r) => sum + n(r.metricValues[0]?.value), 0),
    topSocialCampaign: campaigns[0]?.dimensionValues?.[0]?.value ?? null,
  };
}

const ADSENSE_METRICS = [
  "ESTIMATED_EARNINGS",
  "PAGE_VIEWS",
  "IMPRESSIONS",
  "CLICKS",
  "PAGE_VIEWS_RPM",
];

/** date: YYYY-MM-DD (AdSense 계정 시간대 기준) */
export async function fetchAdsenseDaily(
  token: string,
  accountId: string | undefined,
  date: string,
): Promise<Result<AdsenseDaily>> {
  if (!accountId) return { ok: false, error: "미설정" };
  try {
    const [y, m, d] = date.split("-");
    const qs = new URLSearchParams({
      dateRange: "CUSTOM",
      "startDate.year": y!,
      "startDate.month": m!,
      "startDate.day": d!,
      "endDate.year": y!,
      "endDate.month": m!,
      "endDate.day": d!,
      reportingTimeZone: "ACCOUNT_TIME_ZONE",
      currencyCode: "KRW",
    });
    for (const metric of ADSENSE_METRICS) qs.append("metrics", metric);
    const report = await getJson(
      `https://adsense.googleapis.com/v2/accounts/${accountId}/reports:generate?${qs.toString()}`,
      token,
    );
    return { ok: true, data: parseAdsense(report) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

type AdsenseReport = {
  headers: { name: string; currencyCode?: string }[];
  totals?: { cells: { value?: string }[] };
};

export function parseAdsense(report: AdsenseReport): AdsenseDaily {
  const cell = (name: string) => {
    const i = report.headers.findIndex((h) => h.name === name);
    return Number(report.totals?.cells[i]?.value ?? 0);
  };
  return {
    estimatedEarnings: cell("ESTIMATED_EARNINGS"),
    pageViews: cell("PAGE_VIEWS"),
    impressions: cell("IMPRESSIONS"),
    clicks: cell("CLICKS"),
    pageViewsRpm: cell("PAGE_VIEWS_RPM"),
    currency: report.headers.find((h) => h.currencyCode)?.currencyCode ?? "KRW",
  };
}
