import { normalizeCompanyName } from "@sunsal/db";

export type MatchResult =
  | { status: "listed"; companyKey: string }
  | { status: "not_listed" }
  | { status: "needs_review"; reason: "multiple_builders" | "similar_name" }
  | { status: "unknown" };

const JOINT = /[,/·ㆍ&+]|\s외(?:\s|\d|$)|\s및\s|컨소시엄|공동도급/;

/**
 * 단지 시공사 원문 → 발표 회사 키.
 * 정규화 후 완전히 같거나 검토된 별칭일 때만 확정한다. 공동시공·유사 표기는 needs_review로 돌려 순위를 붙이지 않는다.
 */
export function matchBuilder(
  builderRaw: string | null,
  rankedKeys: ReadonlySet<string>,
  aliases: ReadonlyMap<string, string>,
): MatchResult {
  const raw = builderRaw?.trim() ?? "";
  const normalized = normalizeCompanyName(raw);
  if (!normalized) return { status: "unknown" };
  if (JOINT.test(raw)) return { status: "needs_review", reason: "multiple_builders" };

  const key = aliases.get(normalized) ?? normalized;
  if (rankedKeys.has(key)) return { status: "listed", companyKey: key };

  // "대우" ↔ "대우건설"처럼 한쪽이 다른 쪽을 포함하면 같은 회사일 수도 있으니 확정하지 않는다.
  for (const k of rankedKeys)
    if (k.includes(key) || key.includes(k))
      return { status: "needs_review", reason: "similar_name" };
  return { status: "not_listed" };
}
