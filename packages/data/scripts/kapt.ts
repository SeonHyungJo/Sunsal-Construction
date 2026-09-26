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

async function call(url: string, params: Record<string, string>, serviceKey: string) {
  const qs = new URLSearchParams({ serviceKey, _type: "json", ...params });
  const res = await fetch(`${url}?${qs.toString()}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) {
    // 인증키 오류 등은 OpenAPI_ServiceResponse.cmmMsgHeader.errMsg로 온다
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${body.match(/[A-Z_]+_ERROR/)?.[0] ?? ""}`.trim());
  }
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    // 인증키 오류 등은 XML로 온다
    throw new Error(`non-JSON response: ${text.slice(0, 120).replace(/\s+/g, " ")}`);
  }
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
