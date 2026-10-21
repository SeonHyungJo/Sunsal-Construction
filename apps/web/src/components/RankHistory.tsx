import type { BuilderMatch } from "@sunsal/contract";
import { month, num } from "../lib/format";

export type HistoryRow = { periodStart: string; periodEnd: string; match: BuilderMatch };

/** 반기 발표별 명단 결과 목록 (오래된 순) */
export function RankHistoryList({ rows }: { rows: HistoryRow[] }) {
  return (
    <ul className="tnum mt-2 flex flex-col gap-1 text-sm">
      {rows.map((a) => (
        <li key={a.periodStart} className="flex justify-between gap-4">
          <span className="text-ink-2">
            {month(a.periodStart)}~{month(a.periodEnd)} 판정
          </span>
          <span className={a.match.status === "listed" ? "font-semibold text-accent" : ""}>
            {a.match.status === "listed"
              ? `${a.match.company.rank}위 · ${num(a.match.company.companyDefectCount)}건`
              : a.match.status === "not_listed"
                ? "명단 밖"
                : "매칭 확인 필요"}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 공개된 반기 발표 전체에서 명단에 든 횟수·최고 순위·최근 변화를 문장으로 */
export function RankHistory({ rows, subject }: { rows: HistoryRow[]; subject: string }) {
  const listed = rows.flatMap((r) => (r.match.status === "listed" ? [{ ...r, ...r.match }] : []));
  const best = listed.reduce<(typeof listed)[number] | undefined>(
    (b, r) => (!b || r.company.rank < b.company.rank ? r : b),
    undefined,
  );
  const [prev, last] = rows
    .slice(-2)
    .map((r) => (r.match.status === "listed" ? r.match.company.rank : null));
  return (
    <section aria-labelledby="rank-history" className="border border-rule p-4">
      <h2 id="rank-history" className="font-semibold">
        반기 발표별 {subject} 순위
      </h2>
      <p className="mt-2 text-sm">
        {listed.length
          ? `공개된 반기 발표 ${rows.length}번 중 ${listed.length}번 상위 20개사 명단에 있었습니다. 가장 높은 순위는 ${best!.company.rank}위(${month(best!.periodStart)}~${month(best!.periodEnd)} 판정)입니다.`
          : `공개된 반기 발표 ${rows.length}번 모두 상위 20개사 명단에 없었습니다.`}
        {rows.length > 1 &&
          (prev || last) &&
          ` 직전 발표 ${prev ? `${prev}위` : "명단 밖"} → 최근 ${last ? `${last}위` : "명단 밖"}.`}
      </p>
      <RankHistoryList rows={rows} />
      <p className="mt-2 text-xs text-ink-3">
        반기마다 최근 6개월 동안의 회사 전체 하자 판정 건수 상위 20개사만 공개됩니다. 순위가
        오르내리는 것은 그 기간에 판정된 사건 수에 따른 것으로, 공급 물량이 많은 회사는 건수가 많을
        수 있습니다.
      </p>
    </section>
  );
}
