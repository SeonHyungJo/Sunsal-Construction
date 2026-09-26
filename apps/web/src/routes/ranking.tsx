import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdSlot } from "../components/AdSlot";
import { RankTable } from "../components/RankTable";
import { SourceLine } from "../components/SourceLine";
import { orpc } from "../lib/orpc";

export const Route = createFileRoute("/ranking")({
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.ranking.latest.queryOptions()),
  head: () => ({ meta: [{ title: "공동주택 하자 판정 건수 상위 20개 건설사 · 순살시공" }] }),
  component: Ranking,
});

function Ranking() {
  const { data, isPending, isError } = useQuery(orpc.ranking.latest.queryOptions());
  return (
    <article className="max-w-3xl">
      <h1 className="text-display font-extrabold tracking-tight">
        하자 판정 건수 상위 20개 건설사
      </h1>
      {data && (
        <div className="mt-2">
          <p className="text-ink-2">{data.announcement.title}</p>
          <SourceLine announcement={data.announcement} location="ranking" />
        </div>
      )}
      <p className="mt-4 bg-paper-2 p-4 text-sm leading-relaxed text-ink-2">
        국토교통부가 발표한 최근 6개월 하자 판정 건수(세부 하자수) 기준 상위 20개사입니다. 같은
        건수는 같은 순위이며, 21위 이하는 공개되지 않아 표시하지 않습니다. 건수는 회사 전체 기준이며
        개별 단지의 하자 여부를 뜻하지 않습니다.
      </p>
      <div className="mt-6">
        {isPending && <p className="py-8 text-ink-3">순위를 불러오는 중…</p>}
        {isError && (
          <p className="py-8 text-ink-2">순위를 불러오지 못했습니다. 새로고침해 주세요.</p>
        )}
        {data && <RankTable companies={data.companies} caption="하자 판정 건수 1~20위" />}
      </div>
      <Link
        to="/search"
        className="mt-8 inline-flex min-h-12 items-center bg-accent px-5 font-semibold whitespace-nowrap text-accent-ink hover:bg-ink"
      >
        우리 아파트 시공사 확인하기
      </Link>
      <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_LANDING} />
    </article>
  );
}
