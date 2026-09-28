import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdSlot } from "../components/AdSlot";
import { RankingBoard, type RankingView } from "../components/RankingBoard";
import { SearchBox } from "../components/SearchBox";
import { SectionTitle, TextLink } from "../components/ui";
import { orpc } from "../lib/orpc";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(orpc.ranking.latest.queryOptions()),
      context.queryClient.ensureQueryData(orpc.ranking.history.queryOptions()),
    ]),
  component: Landing,
});

function Landing() {
  const [view, setView] = useState<RankingView>({ period: "5y" });

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

      <section aria-labelledby="top10">
        <SectionTitle id="top10">하자 판정 건수 상위 10개사</SectionTitle>
        <div className="mt-3">
          <RankingBoard view={view} onChange={setView} preview />
        </div>
        <p className="mt-4 text-sm text-ink-3">
          국토교통부 공개 자료의 회사 전체 하자 판정 건수(세부 하자수) 기준입니다. 개별 단지의 하자
          여부를 뜻하지 않습니다. <TextLink to="/methodology">기준 자세히</TextLink>
        </p>
        <AdSlot name="landing" />
      </section>
    </div>
  );
}
