// 국토교통부 K-apt OpenAPI (공공데이터포털). 개발계정 일 5,000건.
const LIST_URL = "https://apis.data.go.kr/1613000/AptListService4/getTotalAptList4";
const BASIS_URL = "https://apis.data.go.kr/1613000/AptBasisInfoServiceV5/getAphusBassInfoV5";

export type KaptListItem = {
  kaptCode: string;
  kaptName: string;
  bjdCode?: string;
  as1?: string;
  as2?: string;
  as3?: string;
};

export type ComplexBasis = {
  name: string;
  legalAddress: string | null;
  roadAddress: string | null;
  builderRaw: string | null;
  developerRaw: string | null;
  approvalDate: string | null;
  households: number | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 호출 제한에 걸림. cron 회차를 멈추고 다음 회차에 이어간다. */
export class ThrottledError extends Error {}

// 호출 한도: 초당 한도(429 ..._PER_SECOND_EXCEEDS_ERROR)와, 짧은 시간에 40여 건을 넘기면
// 원천 서버가 몇 분간 200 + HTTP_ERROR(04)를 주는 숨은 한도가 있다.
// ponytail: 고정 간격 1.5초. 한도가 공식 확인되면 조정한다.
export const throttle = { intervalMs: 1500 }; // 테스트에서 0으로 바꾼다
let lastCall = 0;

async function call(url: string, params: Record<string, string>, serviceKey: string) {
  await sleep(Math.max(0, lastCall + throttle.intervalMs - Date.now()));
  lastCall = Date.now();
  const qs = new URLSearchParams({ serviceKey, _type: "json", ...params });
  const res = await fetch(`${url}?${qs.toString()}`, { signal: AbortSignal.timeout(10_000) });
  const text = await res.text();
  if (res.status === 429) throw new ThrottledError("HTTP 429");
  if (!res.ok)
    throw new Error(`HTTP ${res.status} ${text.match(/[A-Z_]+_ERROR/)?.[0] ?? ""}`.trim());
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`non-JSON response: ${text.slice(0, 120).replace(/\s+/g, " ")}`);
  }
  // 게이트웨이 오류(인증·한도·원천 서버)는 200 + OpenAPI_ServiceResponse로 온다
  const gatewayError: string | undefined = json.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg;
  if (gatewayError === "HTTP_ERROR") throw new ThrottledError("gateway HTTP_ERROR");
  if (gatewayError) throw new Error(`gateway ${gatewayError}`);
  const root = json.response ?? json;
  const code = root.header?.resultCode;
  if (code !== "00" && code !== "000")
    throw new Error(`resultCode ${code}: ${root.header?.resultMsg}`);
  return root.body ?? {};
}

const asArray = <T>(v: T | T[] | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const str = (v: unknown) =>
  typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null;

export async function fetchListPage(serviceKey: string, pageNo: number, numOfRows = 1000) {
  const body = await call(
    LIST_URL,
    { pageNo: String(pageNo), numOfRows: String(numOfRows) },
    serviceKey,
  );
  const items = asArray<KaptListItem>(body.items?.item ?? body.items);
  return { items, totalCount: Number(body.totalCount ?? 0) };
}

export async function fetchBasis(serviceKey: string, kaptCode: string): Promise<ComplexBasis> {
  const body = await call(BASIS_URL, { kaptCode }, serviceKey);
  const item = body.item ?? asArray(body.items?.item ?? body.items)[0];
  if (!item?.kaptCode) throw new Error("empty item");
  return parseBasis(item);
}

export function parseBasis(item: Record<string, unknown>): ComplexBasis {
  const usedate = str(item.kaptUsedate)?.replace(/\D/g, "");
  const households = Number.parseInt((str(item.kaptdaCnt) ?? "").replace(/,/g, ""), 10);
  return {
    name: str(item.kaptName) ?? "",
    legalAddress: str(item.kaptAddr),
    roadAddress: str(item.doroJuso),
    builderRaw: str(item.kaptBcompany),
    developerRaw: str(item.kaptAcompany),
    approvalDate:
      usedate?.length === 8
        ? `${usedate.slice(0, 4)}-${usedate.slice(4, 6)}-${usedate.slice(6)}`
        : null,
    households: Number.isFinite(households) ? households : null,
  };
}
