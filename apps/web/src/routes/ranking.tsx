import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AdSlot } from "../components/AdSlot";
import { RankTable } from "../components/RankTable";
import { SourceLine } from "../components/SourceLine";
import { ButtonLink, ErrorText, Loading, Note, PageHeader, SegmentedTabs } from "../components/ui";
import { month } from "../lib/format";
import { orpc } from "../lib/orpc";

type Period = "6m" | "5y";

export const Route = createFileRoute("/ranking")({
  validateSearch: (s: Record<string, unknown>): { period?: Period } =>
    s.period === "5y" ? { period: "5y" } : {},
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.ranking.latest.queryOptions()),
  head: () => ({ meta: [{ title: "공동주택 하자 판정 건수 상위 20개 건설사 · 순살시공" }] }),
  component: Ranking,
});

function Ranking() {
  const { period = "6m" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data, isPending, isError } = useQuery(orpc.ranking.latest.queryOptions());
  const table =
    period === "5y" && data?.cumulative
      ? data.cumulative
      : data && { ...data.announcement, companies: data.companies };
  const range = table ? `${month(table.periodStart)}~${month(table.periodEnd)}` : "";

  return (
    <article className="max-w-3xl">
      <PageHeader title="하자 판정 건수 상위 20개 건설사" lead={data?.announcement.title}>
        {data && (
          <div className="mt-1">
            <SourceLine announcement={data.announcement} location="ranking" />
          </div>
        )}
      </PageHeader>

      {data?.cumulative && (
        <SegmentedTabs
          label="집계 기간"
          value={period}
          onChange={(p) =>
            void navigate({ search: p === "5y" ? { period: "5y" } : {}, replace: true })
          }
          options={[
            { value: "6m", label: "최근 6개월" },
            { value: "5y", label: "최근 5년 누계" },
          ]}
        />
      )}

      <Note className="mt-4">
        국토교통부가 발표한 {period === "5y" ? "최근 5년 누계" : "최근 6개월"}({range}) 하자 판정
        건수(세부 하자수) 기준 상위 20개사입니다. 같은 건수는 같은 순위이며, 21위 이하는 공개되지
        않아 표시하지 않습니다. 건수는 회사 전체 기준이며 개별 단지의 하자 여부를 뜻하지 않습니다.
      </Note>

      <div className="mt-6">
        {isPending && <Loading>순위를 불러오는 중…</Loading>}
        {isError && <ErrorText>순위를 불러오지 못했습니다. 새로고침해 주세요.</ErrorText>}
        {table && (
          <RankTable
            companies={table.companies}
            caption={`${period === "5y" ? "최근 5년 누계" : "최근 6개월"} 하자 판정 건수 1~20위`}
          />
        )}
      </div>

      <ButtonLink to="/search" variant="accent" className="mt-8">
        우리 아파트 시공사 확인하기
      </ButtonLink>
      <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_LANDING} />
    </article>
  );
}
