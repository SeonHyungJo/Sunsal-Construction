// 순위 보드: 최근 5년 누계 → 최근 6개월 → 반기별(발표 선택). 홈(1~10위 미리보기)과 /ranking(전체)에서 같이 쓴다.
import { useQuery } from "@tanstack/react-query";
import { month } from "../lib/format";
import { orpc } from "../lib/orpc";
import { track } from "../lib/track";
import { RankTable } from "./RankTable";
import { SourceLine } from "./SourceLine";
import { ButtonLink, ErrorText, Loading, Note, SegmentedTabs } from "./ui";

export type Period = "5y" | "6m" | "half";
export type RankingView = { period: Period; id?: string };

const PREVIEW = 10;

/** "2025-h2" → "2025년 하반기" */
export const halfLabel = (id: string) =>
  `${id.slice(0, 4)}년 ${id.endsWith("h1") ? "상반기" : "하반기"}`;

export function RankingBoard({
  view,
  onChange,
  preview,
}: {
  view: RankingView;
  onChange: (v: RankingView) => void;
  preview?: boolean; // 1~10위만 보여주고 '자세히 보기'로 /ranking 연결
}) {
  const latest = useQuery(orpc.ranking.latest.queryOptions());
  const history = useQuery(orpc.ranking.history.queryOptions());
  if (latest.isPending || history.isPending) return <Loading>순위를 불러오는 중…</Loading>;
  if (latest.isError || history.isError || !latest.data)
    return <ErrorText>순위를 불러오지 못했습니다. 새로고침해 주세요.</ErrorText>;

  const halves = history.data; // 최신순
  const selected =
    view.period === "half"
      ? (halves.find((h) => h.announcement.id === view.id) ?? halves[0]!)
      : null;
  const cumulative = latest.data.cumulative;
  const table =
    view.period === "5y" && cumulative
      ? { label: "최근 5년 누계", ...cumulative, announcement: latest.data.announcement }
      : view.period === "half" && selected
        ? {
            label: `${halfLabel(selected.announcement.id)} 발표 · 6개월`,
            ...selected.announcement,
            companies: selected.companies,
            announcement: selected.announcement,
          }
        : {
            label: "최근 6개월",
            ...latest.data.announcement,
            companies: latest.data.companies,
            announcement: latest.data.announcement,
          };
  const range = `${month(table.periodStart)}~${month(table.periodEnd)}`;
  const companies = preview ? table.companies.filter((c) => c.rank <= PREVIEW) : table.companies;
  const order = (id: string) => halves.length - halves.findIndex((h) => h.announcement.id === id); // 1차부터

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedTabs
          label="집계 기간"
          value={view.period}
          onChange={(period) =>
            onChange(
              period === "half"
                ? { period, id: halves[1]?.announcement.id ?? halves[0]?.announcement.id }
                : { period },
            )
          }
          options={[
            ...(cumulative ? [{ value: "5y" as const, label: "최근 5년" }] : []),
            { value: "6m" as const, label: "최근 6개월" },
            { value: "half" as const, label: "반기별" },
          ]}
        />
        {view.period === "half" && (
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">발표 선택</span>
            <select
              value={selected?.announcement.id}
              onChange={(e) => onChange({ period: "half", id: e.target.value })}
              className="min-h-11 border-2 border-ink bg-paper px-2 font-semibold"
            >
              {halves.map((h) => (
                <option key={h.announcement.id} value={h.announcement.id}>
                  {halfLabel(h.announcement.id)} ({order(h.announcement.id)}차) ·{" "}
                  {month(h.announcement.periodStart)}~{month(h.announcement.periodEnd)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-3">
        <SourceLine
          announcement={{
            ...table.announcement,
            periodStart: table.periodStart,
            periodEnd: table.periodEnd,
          }}
          location={preview ? "landing" : "ranking"}
        />
      </div>

      <div className="mt-2">
        <RankTable
          companies={companies}
          caption={`${table.label}(${range}) 하자 판정 건수 ${preview ? `1~${PREVIEW}` : "전체"}위`}
        />
      </div>

      {preview ? (
        <ButtonLink
          to="/ranking"
          search={
            view.period === "half"
              ? { period: "half", id: selected?.announcement.id }
              : { period: view.period }
          }
          onClick={() => track("ranking_expand")}
          className="mt-5"
        >
          자세히 보기 (1~20위)
        </ButtonLink>
      ) : (
        <Note className="mt-4">
          국토교통부가 발표한 {table.label}({range}) 하자 판정 건수(세부 하자수) 기준 상위
          20개사입니다. 같은 건수는 같은 순위이며(20위가 동률이면 20개사를 넘을 수 있음), 21위
          이하는 공개되지 않아 표시하지 않습니다. 건수는 회사 전체 기준이며 개별 단지의 하자 여부를
          뜻하지 않습니다.
        </Note>
      )}
    </div>
  );
}
