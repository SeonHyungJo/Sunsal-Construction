import { type MatchRules, normalizeCompanyName } from "@sunsal/data";

export type MatchResult =
  | { status: "listed"; companyKey: string }
  | { status: "not_listed" }
  | { status: "needs_review"; reason: "multiple_builders" | "similar_name" }
  | { status: "unknown" };

// 공동시공 구분. "E&C" 같은 회사명 안의 &·+는 제외하려고 앞뒤 공백이 있을 때만 구분자로 본다.
const JOINT = /[,/·ㆍ]|[가-힣)]\.[가-힣A-Z(]|\s[&+]\s|\s외(?:\s|\d|$)|\s및\s|컨소시엄|공동도급/;
// K-apt 원문에 시공사 대신 들어 있는 자리표시 (정규화 후 비교). 2026-09-26 수집 데이터에서 확인한 표기
export const PLACEHOLDER =
  /^(없음|모름|알수없음|미상|확인안됨|확인불가|해당없음|기타|추후.*|건축물대장.*없음|\d*)$/;
// 핵심 이름 비교용: 끝의 일반 명사를 뗀다 ("신동아종합" ↔ "신동아건설" → "신동아")
const GENERIC_SUFFIX =
  /(종합건설|건설산업|건설|종합|산업개발|산업|개발|주택|엔지니어링|이앤씨|E&C|ENC)$/;
function core(name: string) {
  let c = name;
  for (let prev = ""; prev !== c && c.length > 2;) [prev, c] = [c, c.replace(GENERIC_SUFFIX, "")];
  return c;
}

/**
 * 단지 시공사 원문 → 발표 회사 키.
 * 정규화 후 완전히 같거나 검토된 별칭일 때만 확정한다. 공동시공·유사 표기·검토 목록은 needs_review로 돌려 순위를 붙이지 않는다.
 * 확실하지 않은 이름을 "명단 밖"으로 보내면 순위 회사를 놓칠 수 있으므로, 애매하면 needs_review 쪽으로 기운다.
 */
export function matchBuilder(
  builderRaw: string | null,
  rankedKeys: ReadonlySet<string>,
  { aliases, reviewNames, distinctNames }: MatchRules,
): MatchResult {
  const raw = builderRaw?.trim() ?? "";
  const normalized = normalizeCompanyName(raw);
  if (!normalized || PLACEHOLDER.test(normalized)) return { status: "unknown" };
  if (JOINT.test(raw)) return { status: "needs_review", reason: "multiple_builders" };

  // 명단에 이름이 그대로 있으면 우선한다. 발표마다 합산 법인이 달라서다
  // (예: ㈜한양은 2024년 명단에선 별도 순위, 2025-h2에선 비에스한양에 합산).
  if (rankedKeys.has(normalized)) return { status: "listed", companyKey: normalized };
  // 검토된 별칭은 신원이 확정된 것이다. 이 명단에 그 회사가 없으면 유사도를 볼 필요 없이 명단 밖.
  const aliased = aliases.get(normalized);
  if (aliased)
    return rankedKeys.has(aliased)
      ? { status: "listed", companyKey: aliased }
      : { status: "not_listed" };
  if (reviewNames.has(normalized)) return { status: "needs_review", reason: "similar_name" };
  if (distinctNames.has(normalized)) return { status: "not_listed" };

  // "대우" ↔ "대우건설"처럼 한쪽이 다른 쪽을 포함하거나, 핵심 이름이 같으면 같은 회사일 수도 있다.
  // 비교 대상은 이 명단의 회사와, 이 명단의 회사를 가리키는 별칭뿐이다.
  // 한 글자 이름(예: 별칭 "솔")은 포함 비교에서 뺀다 — "한솔건설" 같은 무관한 회사가 걸린다.
  const contains = (a: string, b: string) => b.length >= 2 && a.includes(b);
  const c = core(normalized);
  const candidates = [
    ...rankedKeys,
    ...[...aliases].filter(([, company]) => rankedKeys.has(company)).map(([alias]) => alias),
  ];
  for (const k of candidates)
    if (contains(k, normalized) || contains(normalized, k) || core(k) === c)
      return { status: "needs_review", reason: "similar_name" };
  return { status: "not_listed" };
}
