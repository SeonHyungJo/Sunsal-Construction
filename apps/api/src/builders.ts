// 단지 시공사 원문 → 건설사 페이지용 이름. 공동시공이면 참여 회사마다 하나씩.
import { aliases, normalizeCompanyName } from "@sunsal/data";
import { PLACEHOLDER } from "./match.ts";

// match.ts JOINT와 같은 구분자. "E&C"처럼 회사명 안의 &·+는 앞뒤 공백이 있을 때만 나눈다.
const SEPARATOR = /[,/·ㆍ]|(?<=[가-힣)])\.(?=[가-힣A-Z(])|\s[&+]\s|\s및\s/;
const TRAILER = /(\s외\s*\d*.*|\s등|컨소시엄|공동도급)$/; // "한일건설 외 2", "대우건설컨소시엄"

/** complex_builders.name 값 (정규화, 별칭은 풀지 않는다 — 별칭 표가 바뀌어도 재색인이 필요 없게) */
export function builderNames(builderRaw: string | null): string[] {
  const names = (builderRaw ?? "")
    .split(SEPARATOR)
    .map((p) => normalizeCompanyName(p.trim().replace(TRAILER, "")))
    .filter((n) => n.length >= 2 && !PLACEHOLDER.test(n));
  return [...new Set(names)];
}

/** 건설사 페이지 키: 별칭이면 발표 회사 키로 */
export const builderKey = (name: string) => aliases.get(name) ?? name;

/** 이 키로 모이는 모든 이름 (키 자신 + 이 키를 가리키는 별칭) */
export const namesForKey = (key: string) => [
  key,
  ...[...aliases].filter(([, company]) => company === key).map(([alias]) => alias),
];
