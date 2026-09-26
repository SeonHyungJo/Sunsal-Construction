import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdSlot } from "../components/AdSlot";
import { RankTable } from "../components/RankTable";
import { SearchBox } from "../components/SearchBox";
import { SourceLine } from "../components/SourceLine";
import { orpc } from "../lib/orpc";
import { track } from "../lib/track";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.ranking.latest.queryOptions()),
  component: Landing,
});

function Landing() {
  const ranking = useQuery(orpc.ranking.latest.queryOptions());
  const data = ranking.data;

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-12">
      <section aria-labelledby="hero" className="md:sticky md:top-6 md:self-start">
        <h1 id="hero" className="text-display font-extrabold tracking-tight">
          우리 아파트 시공사,
          <br />
          공식 하자 판정 순위에 있을까?
        </h1>
        <p className="mt-3 text-ink-2">
          주소를 입력하면 단지의 시공사와 국토교통부 공개 순위를 함께 보여드립니다.
        </p>
        <div className="mt-6">
          <SearchBox location="landing" />
        </div>
      </section>

      <section aria-labelledby="top5">
        <h2 id="top5" className="text-xl font-extrabold">
          {data
            ? `${data.announcement.title.match(/\d{2}년 [상하]반기/)?.[0] ?? ""} 공동주택 하자 판정 건수 순위`
            : "공동주택 하자 판정 건수 순위"}
        </h2>
        {data && <SourceLine announcement={data.announcement} location="landing" />}
        <div className="mt-4">
          {ranking.isPending && <p className="py-8 text-ink-3">순위를 불러오는 중…</p>}
          {ranking.isError && (
            <p className="py-8 text-ink-2">순위를 불러오지 못했습니다. 새로고침해 주세요.</p>
          )}
          {data === null && <p className="py-8 text-ink-2">공개된 순위 자료가 아직 없습니다.</p>}
          {data && (
            <RankTable
              companies={data.companies.filter((c) => c.rank <= 5)}
              caption="하자 판정 건수 1~5위"
            />
          )}
        </div>
        <p className="mt-3 text-sm text-ink-3">
          최근 6개월간 회사 전체가 받은 하자 판정 건수(세부 하자수) 기준입니다. 개별 단지의 하자
          여부를 뜻하지 않습니다.{" "}
          <Link to="/methodology" className="underline underline-offset-4 hover:text-ink">
            기준 자세히
          </Link>
        </p>
        <Link
          to="/ranking"
          onClick={() => track("ranking_expand")}
          className="mt-5 inline-flex min-h-12 items-center border-2 border-ink px-5 font-semibold whitespace-nowrap hover:bg-ink hover:text-paper"
        >
          전체 20위 보기
        </Link>
        <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_LANDING} />
      </section>
    </div>
  );
}
