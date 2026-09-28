import { ORPCError } from "@orpc/client";
import type { BuilderMatch, Client } from "@sunsal/contract";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdSlot } from "../components/AdSlot";
import { SourceLine } from "../components/SourceLine";
import {
  Button,
  ButtonLink,
  Callout,
  ExternalLink,
  PageHeader,
  SectionTitle,
  TextLink,
} from "../components/ui";
import { loadAdsense } from "../lib/ads";
import { dateTime, dot, month, num } from "../lib/format";
import { orpc } from "../lib/orpc";
import { track } from "../lib/track";

type Result = Awaited<ReturnType<Client["complex"]["result"]>>;

export const Route = createFileRoute("/complex/$kaptCode")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      orpc.complex.result.queryOptions({ input: { kaptCode: params.kaptCode } }),
    ),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.complex.name} 시공사 확인 · 순살시공`
          : "시공사 확인 · 순살시공",
      },
    ],
  }),
  component: ResultPage,
  pendingComponent: () => <p className="py-8 text-ink-3">단지 정보를 불러오는 중…</p>,
  errorComponent: ({ error }) => (
    <section className="max-w-2xl">
      <PageHeader
        title={
          error instanceof ORPCError && error.code === "NOT_FOUND"
            ? "단지를 찾을 수 없습니다"
            : "결과를 불러오지 못했습니다"
        }
        lead="주소 검색에서 단지를 다시 선택해 주세요."
      />
      <ButtonLink to="/search">주소 다시 검색</ButtonLink>
    </section>
  ),
});

function ResultPage() {
  const { kaptCode } = Route.useParams();
  const { data } = useSuspenseQuery(orpc.complex.result.queryOptions({ input: { kaptCode } }));
  const { complex: c, match, announcement: a } = data;
  const status = match.status;
  const reason = match.status === "needs_review" ? match.reason : undefined;
  const collected = data.complexDataSyncedAt !== null;

  useEffect(() => {
    loadAdsense(); // Offerwall은 AdSense 콘솔에서 이 경로에 설정한다. 광고가 없어도 아래 결과는 그대로 보인다.
    track("result_view", { match_status: status });
    if (status === "needs_review" || status === "unknown")
      track("builder_match_failed", { reason: reason ?? "unknown" });
    // 재조회로 match 객체가 바뀌어도 같은 단지·상태면 다시 보내지 않는다.
  }, [kaptCode, status, reason]);

  return (
    <article>
      {/* 1. 내가 선택한 단지 */}
      <div className="border-b border-rule">
        <PageHeader
          eyebrow="선택한 단지"
          title={c.name}
          lead={c.roadAddress ?? c.legalAddress ?? "주소 정보 수집 전"}
        >
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {c.approvalDate && (
              <div className="flex gap-2">
                <dt className="text-ink-3">사용승인</dt>
                <dd>{dot(c.approvalDate)}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-ink-3">시공사(단지 정보 원문)</dt>
              <dd className="font-semibold">{c.builderRaw ?? "정보 없음"}</dd>
            </div>
            {data.builders.length > 0 && (
              <div className="flex gap-2">
                <dt className="text-ink-3">건설사별 시공 단지</dt>
                <dd className="flex flex-wrap gap-x-3">
                  {data.builders.map((b) => (
                    <TextLink key={b.key} to="/builder/$key" params={{ key: b.key }}>
                      {b.name}
                    </TextLink>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </PageHeader>
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          {/* 2. 핵심 결과(최근 6개월) + 3. 해석 */}
          {match.status === "not_listed" && data.cumulative?.match.status === "not_listed" ? (
            <Callout
              tone="neutral"
              titleId="result-not-listed"
              title="최근 6개월 · 최근 5년 누계 모두 상위 20개사 명단에 없습니다"
            >
              {`집계 기간: 최근 6개월(${a ? `${month(a.periodStart)}~${month(a.periodEnd)}` : "-"}) · 최근 5년 누계(${month(data.cumulative.periodStart)}~${month(data.cumulative.periodEnd)}). `}
              국토교통부는 하자 판정 건수 상위 20개사만 공개합니다. 명단에 없다는 것은 하자가 없거나
              안전하다는 뜻이 아니며, 21위 이하의 순위는 알 수 없습니다.
            </Callout>
          ) : (
            <>
              <MatchBlock
                match={match}
                period={a ? `${month(a.periodStart)}~${month(a.periodEnd)}` : "최근 6개월"}
                label="최근 6개월"
                collected={collected}
                primary
              />
              {data.cumulative && (
                <MatchBlock
                  match={data.cumulative.match}
                  period={`${month(data.cumulative.periodStart)}~${month(data.cumulative.periodEnd)}`}
                  label="최근 5년 누계"
                  collected={collected}
                />
              )}
            </>
          )}
          <DataFreshness data={data} />
          <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_RESULT} />
        </div>

        <aside className="flex flex-col gap-8">
          {/* 4. 근거 */}
          <section aria-labelledby="basis">
            <SectionTitle id="basis">근거</SectionTitle>
            {a ? (
              <div className="mt-3 flex flex-col gap-1">
                <p className="text-sm">{a.title}</p>
                <SourceLine announcement={a} location="result" />
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-2">공개된 순위 자료가 아직 없습니다.</p>
            )}
            <p className="mt-2 text-sm text-ink-3">
              단지 정보: 국토교통부 공동주택 기본정보(K-apt)
              {data.complexDataSyncedAt && ` · ${dateTime(data.complexDataSyncedAt)} 수집`}
            </p>
            <TextLink to="/methodology" className="mt-2 inline-block text-sm">
              순위 기준과 매칭 방식
            </TextLink>
          </section>

          {/* 5. 다음 행동 */}
          <section aria-labelledby="next">
            <SectionTitle id="next">다음에 할 일</SectionTitle>
            <ul className="mt-3 flex flex-col">
              <li>
                <TextLink to="/checklist" className="flex min-h-11 items-center font-semibold">
                  사전점검·하자 기록 체크리스트
                </TextLink>
              </li>
              <li className="flex min-h-11 items-center">
                <ExternalLink href="https://www.adc.go.kr">
                  하자심사·분쟁조정위원회 (공식)
                </ExternalLink>
              </li>
              <li>
                <TextLink
                  to="/corrections"
                  search={{
                    kaptCode: c.kaptCode,
                    kind: match.status === "needs_review" ? "builder_match" : "complex",
                  }}
                  className="flex min-h-11 items-center text-ink-2"
                >
                  정보가 틀렸다면 정정 요청
                </TextLink>
              </li>
            </ul>
            <ShareButton title={`${c.name} 시공사 확인 · 순살시공`} />
          </section>
          <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_RESULT} />
        </aside>
      </div>
    </article>
  );
}

function MatchBlock({
  match,
  period,
  label,
  collected,
  primary,
}: {
  match: BuilderMatch;
  period: string;
  label: string; // 최근 6개월 | 최근 5년 누계
  collected: boolean; // K-apt 기본정보를 한 번이라도 받았는지
  primary?: boolean; // 첫 블록만 해석 문구를 길게
}) {
  const titleId = `result-${label}`;
  const heading = (text: string) => `${label} · ${text}`;

  switch (match.status) {
    case "listed":
      return (
        <Callout
          tone="accent"
          titleId={titleId}
          title={heading("공개된 상위 20개사 명단에 있습니다")}
        >
          <TextLink
            to="/builder/$key"
            params={{ key: match.company.companyKey }}
            className="text-lg font-semibold text-ink"
          >
            {match.company.companyName}
          </TextLink>
          <p className="tnum mt-1 flex flex-wrap items-baseline gap-x-4 text-ink">
            <span
              className={
                primary
                  ? "text-4xl font-extrabold text-accent"
                  : "text-2xl font-extrabold text-accent"
              }
            >
              {match.company.rank}위
            </span>
            <span>
              하자 판정 <strong className="text-xl">{num(match.company.companyDefectCount)}</strong>
              건
              <span className="text-sm text-ink-3">
                {" "}
                (세부 하자수 · 사건 {num(match.company.companyCaseCount)}건)
              </span>
            </span>
          </p>
          {match.company.note && (
            <p className="mt-1 text-xs text-ink-3">발표 각주: {match.company.note}</p>
          )}
          <p className="mt-3">
            이 수치는 시공사 <strong>회사 전체</strong>가 집계 기간({period}) 동안 받은 하자 판정
            건수이며, 검색한 단지 자체의 하자 건수가 아닙니다.
          </p>
        </Callout>
      );
    case "not_listed":
      return (
        <Callout
          tone="neutral"
          titleId={titleId}
          title={heading("공개된 상위 20개사 명단에 없습니다")}
        >
          {primary
            ? "국토교통부는 하자 판정 건수 상위 20개사만 공개합니다. 명단에 없다는 것은 하자가 없거나 안전하다는 뜻이 아니며, 21위 이하의 순위는 알 수 없습니다."
            : `집계 기간(${period}) 상위 20개사 명단에도 없습니다.`}
        </Callout>
      );
    case "needs_review":
      return (
        <Callout tone="review" titleId={titleId} title={heading("시공사 매칭 확인 필요")}>
          {match.reason === "multiple_builders"
            ? "여러 회사가 함께 시공한 단지입니다. 어느 회사의 순위를 연결할지 확실하지 않아 순위와 건수를 표시하지 않습니다."
            : "단지 정보의 시공사 표기가 발표 명단의 회사명과 비슷하지만 같은 회사인지 확인되지 않아 순위와 건수를 표시하지 않습니다."}
        </Callout>
      );
    case "unknown":
      if (!primary) return null; // 시공사 정보가 없다는 안내는 한 번만
      return (
        <Callout
          tone="muted"
          titleId={titleId}
          title={collected ? "시공사 정보가 없습니다" : "시공사 정보를 수집하고 있습니다"}
        >
          {collected
            ? "공동주택 기본정보에 이 단지의 시공사가 등록되어 있지 않아 순위를 확인할 수 없습니다."
            : "이 단지의 상세 정보(주소·시공사)를 아직 받아오지 못했습니다. 순서대로 채워지고 있습니다."}
        </Callout>
      );
  }
}

/** 수집한 지 오래된 단지 안내. 아직 수집 전인 단지는 MatchBlock이 안내한다. */
function DataFreshness({ data }: { data: Result }) {
  if (!data.complexDataStale || !data.complexDataSyncedAt) return null;
  return (
    <p role="note" className="border border-rule p-3 text-sm text-ink-2">
      단지 정보가 {dateTime(data.complexDataSyncedAt)}에 마지막으로 수집되어 최신이 아닐 수
      있습니다.
    </p>
  );
}

function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = location.origin + location.pathname; // 검색어·추적 파라미터 없이
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {});
      track("share", { method: "native" });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track("share", { method: "copy" });
    }
  }
  return (
    <Button variant="subtle" onClick={share} className="mt-4">
      {copied ? "링크를 복사했습니다" : "결과 링크 공유"}
    </Button>
  );
}
