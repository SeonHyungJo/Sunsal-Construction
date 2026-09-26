import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AdSlot } from "../components/AdSlot";
import { RankTable } from "../components/RankTable";
import { SearchBox } from "../components/SearchBox";
import { SourceLine } from "../components/SourceLine";
import { ButtonLink, ErrorText, Loading, SectionTitle, TextLink } from "../components/ui";
import { orpc } from "../lib/orpc";
import { track } from "../lib/track";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.ranking.latest.queryOptions()),
  component: Landing,
});

function Landing() {
  const ranking = useQuery(orpc.ranking.latest.queryOptions());
  const data = ranking.data;
  const half = data?.announcement.title.match(/\d{2}년 [상하]반기/)?.[0];

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
        <SectionTitle id="top5">{half ? `${half} ` : ""}하자 판정 건수 상위 5개사</SectionTitle>
        {data && (
          <div className="mt-2">
            <SourceLine announcement={data.announcement} location="landing" />
          </div>
        )}
        <div className="mt-2">
          {ranking.isPending && <Loading>순위를 불러오는 중…</Loading>}
          {ranking.isError && <ErrorText>순위를 불러오지 못했습니다. 새로고침해 주세요.</ErrorText>}
          {data === null && <ErrorText>공개된 순위 자료가 아직 없습니다.</ErrorText>}
          {data && (
            <RankTable
              companies={data.companies.filter((c) => c.rank <= 5)}
              caption="최근 6개월 하자 판정 건수 1~5위"
            />
          )}
        </div>
        <p className="mt-3 text-sm text-ink-3">
          최근 6개월간 회사 전체가 받은 하자 판정 건수(세부 하자수) 기준입니다. 개별 단지의 하자
          여부를 뜻하지 않습니다. <TextLink to="/methodology">기준 자세히</TextLink>
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonLink to="/ranking" onClick={() => track("ranking_expand")}>
            전체 20위 보기
          </ButtonLink>
          {data?.cumulative && (
            <ButtonLink to="/ranking" search={{ period: "5y" }}>
              최근 5년 누계 순위
            </ButtonLink>
          )}
        </div>
        <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_LANDING} />
      </section>
    </div>
  );
}
