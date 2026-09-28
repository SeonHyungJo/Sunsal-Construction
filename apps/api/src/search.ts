import { type Complex, norm } from "@sunsal/data";

const bigrams = (s: string) =>
  new Set(Array.from({ length: Math.max(s.length - 1, 0) }, (_, i) => s.slice(i, i + 2)));
function dice(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let hit = 0;
  for (const x of a) if (b.has(x)) hit++;
  return (2 * hit) / (a.size + b.size);
}

type Ranked = { x: { name: string; c: Complex }; score: number };
const byRank = (a: Ranked, b: Ranked) =>
  b.score - a.score ||
  a.x.name.length - b.x.name.length ||
  a.x.c.kaptCode.localeCompare(b.x.c.kaptCode);

/** 전체 정렬 없이 상위 k개만 유지한다 ("서울"처럼 수천 건이 걸리는 검색어의 CPU 시간 절약). */
function topK<T>(items: T[], k: number, cmp: (a: T, b: T) => number) {
  const top: T[] = [];
  for (const item of items) {
    if (top.length === k && cmp(item, top[k - 1]!) >= 0) continue;
    let i = top.length;
    while (i > 0 && cmp(item, top[i - 1]!) < 0) i--;
    top.splice(i, 0, item);
    if (top.length > k) top.pop();
  }
  return top;
}

/**
 * 단지명·도로명·지번 주소 부분 일치 검색. 공백은 무시하고, 띄어 쓴 단어는 모두 포함해야 한다.
 * 일치가 없으면 단지명 바이그램 유사도로 오타 후보를 찾는다.
 * ponytail: 2만 건 선형 탐색(수 ms). 단지 수가 크게 늘면 n-gram 역색인으로 바꾼다.
 */
export function createSearch(items: readonly Complex[]) {
  const index = items.map((c) => {
    const name = norm(c.name).replaceAll("아파트", ""); // 검색어에서도 뺀다 (normalizeQuery)
    return {
      c,
      name,
      text: norm(`${c.name} ${c.roadAddress ?? ""} ${c.legalAddress ?? ""}`),
      grams: bigrams(name),
    };
  });

  return (query: string, limit = 10): Complex[] => {
    const tokens = query.split(/\s+/).map(norm).filter(Boolean);
    const whole = tokens.join("");
    if (!whole) return [];

    const exact = index
      .filter((x) => tokens.every((t) => x.text.includes(t)))
      .map((x) => ({
        x,
        score:
          x.name === whole
            ? 3
            : x.name.startsWith(tokens[0]!)
              ? 2
              : tokens.every((t) => x.name.includes(t))
                ? 1
                : 0,
      }));
    const qGrams = bigrams(whole);
    const ranked = exact.length
      ? exact
      : index.map((x) => ({ x, score: dice(qGrams, x.grams) })).filter((r) => r.score >= 0.5);

    return topK(ranked, limit, byRank).map((r) => r.x.c);
  };
}
