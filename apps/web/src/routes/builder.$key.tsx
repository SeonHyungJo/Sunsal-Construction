import { ORPCError } from "@orpc/client";
import type { Client } from "@sunsal/contract";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { AdSlot } from "../components/AdSlot";
import { SourceLine } from "../components/SourceLine";
import { ButtonLink, Callout, PageHeader, SectionTitle, TextLink } from "../components/ui";
import { dot, month, num } from "../lib/format";
import { orpc } from "../lib/orpc";

type Builder = Awaited<ReturnType<Client["builder"]["get"]>>;
type Ranked = NonNullable<Builder["recent"]>;

const AD_AFTER = 10; // 목록 중간 광고 위치 (n번째 단지 뒤)

export const Route = createFileRoute("/builder/$key")({
  validateSearch: (s: Record<string, unknown>): { page?: number } => {
    const page = Number(s.page);
    return { page: Number.isInteger(page) && page > 1 ? page : undefined };
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ context, params, deps }) =>
    context.queryClient.ensureQueryData(
      orpc.builder.get.queryOptions({ input: { key: params.key, page: deps.page } }),
    ),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.name} 시공 아파트 · 하자 판정 순위 · 순살시공`
          : "건설사 · 순살시공",
      },
    ],
  }),
  component: BuilderPage,
  pendingComponent: () => <p className="py-8 text-ink-3">건설사 정보를 불러오는 중…</p>,
  errorComponent: ({ error }) => (
    <section className="max-w-2xl">
      <PageHeader
        title={
          error instanceof ORPCError && error.code === "NOT_FOUND"
            ? "건설사를 찾을 수 없습니다"
            : "건설사 정보를 불러오지 못했습니다"
        }
        lead="건설사 검색에서 다시 찾아 주세요."
      />
      <ButtonLink to="/builders">건설사 검색</ButtonLink>
    </section>
  ),
});

function BuilderPage() {
  const { key } = Route.useParams();
  const { page = 1 } = Route.useSearch();
  const { data } = useSuspenseQuery(orpc.builder.get.queryOptions({ input: { key, page } }));
  const a = data.announcement;
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const first = (page - 1) * data.pageSize;

  return (
    <article>
      <PageHeader
        eyebrow="건설사"
        title={data.name}
        lead={`수집된 단지 중 이 회사가 시공한 단지 ${num(data.total)}곳`}
      />

      <div className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="complexes">
          <SectionTitle id="complexes">시공한 아파트 (사용승인 최신순)</SectionTitle>
          {data.complexes.length ? (
            <ol className="mt-1" start={first + 1}>
              {data.complexes.map((c, i) => (
                <Fragment key={c.kaptCode}>
                  <li className="border-b border-rule">
                    <Link
                      to="/complex/$kaptCode"
                      params={{ kaptCode: c.kaptCode }}
                      className="block py-3 hover:bg-paper-2"
                    >
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-semibold">{c.name}</span>
                        {c.joint && <span className="text-xs text-ink-3">공동시공</span>}
                      </span>
                      <span className="block text-sm text-ink-2">
                        {c.roadAddress ?? c.legalAddress ?? "주소 수집 전"}
                      </span>
                      <span className="block text-xs text-ink-3">
                        {c.approvalDate
                          ? `사용승인 ${dot(c.approvalDate)}`
                          : "사용승인일 정보 없음"}
                      </span>
                    </Link>
                  </li>
                  {i + 1 === AD_AFTER && data.complexes.length > AD_AFTER && (
                    <li className="list-none">
                      <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_BUILDER} />
                    </li>
                  )}
                </Fragment>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-ink-2">
              수집된 단지 중에는 아직 이 회사가 시공한 단지가 없습니다.
            </p>
          )}
          {pages > 1 && (
            <nav aria-label="페이지" className="mt-4 flex items-center justify-between text-sm">
              {page > 1 ? (
                <TextLink to="." search={{ page: page - 1 > 1 ? page - 1 : undefined }}>
                  ← 최근 단지
                </TextLink>
              ) : (
                <span />
              )}
              <span className="tnum text-ink-3">
                {page} / {pages}
              </span>
              {page < pages ? (
                <TextLink to="." search={{ page: page + 1 }}>
                  이전 단지 →
                </TextLink>
              ) : (
                <span />
              )}
            </nav>
          )}
          <p className="mt-4 text-sm text-ink-3">
            단지 정보: 국토교통부 공동주택 기본정보(K-apt)의 시공사 표기 기준입니다. 표기가 다르면
            (예: 옛 회사명) 빠질 수 있습니다.
          </p>
          <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_BUILDER} />
        </section>

        <aside className="flex flex-col gap-4 md:sticky md:top-6 md:self-start">
          <RankCallout
            label="최근 6개월"
            period={a ? `${month(a.periodStart)}~${month(a.periodEnd)}` : ""}
            company={data.recent}
          />
          {data.cumulative && (
            <RankCallout
              label="최근 5년 누계"
              period={`${month(data.cumulative.periodStart)}~${month(data.cumulative.periodEnd)}`}
              company={data.cumulative.company}
            />
          )}
          {a && <SourceLine announcement={a} location="result" />}
          <TextLink to="/ranking" className="text-sm">
            전체 순위 보기
          </TextLink>
        </aside>
      </div>
    </article>
  );
}

function RankCallout({
  label,
  period,
  company,
}: {
  label: string;
  period: string;
  company: Ranked | null;
}) {
  const titleId = `rank-${label}`;
  return company ? (
    <Callout tone="accent" titleId={titleId} title={`${label} · 하자 판정 ${company.rank}위`}>
      집계 기간({period}) 회사 전체 하자 판정 {num(company.companyDefectCount)}건 (사건{" "}
      {num(company.companyCaseCount)}건). 특정 단지의 하자 건수가 아닙니다.
    </Callout>
  ) : (
    <Callout tone="neutral" titleId={titleId} title={`${label} · 상위 20개사 명단에 없습니다`}>
      집계 기간({period}) 기준입니다. 명단에 없다는 것은 하자가 없다는 뜻이 아니며, 21위 이하의
      순위는 공개되지 않습니다.
    </Callout>
  );
}
