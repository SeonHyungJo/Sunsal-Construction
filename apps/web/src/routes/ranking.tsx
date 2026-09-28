import { createFileRoute } from "@tanstack/react-router";
import { AdSlot } from "../components/AdSlot";
import { type Period, RankingBoard } from "../components/RankingBoard";
import { ButtonLink, PageHeader } from "../components/ui";
import { orpc } from "../lib/orpc";

const PERIODS: Period[] = ["5y", "6m", "half"];

// 나중에 AdSense Offerwall을 이 경로(/ranking)에 걸어 상세 순위 열람 전에 광고 시청을 제안한다 (콘솔에서 URL 규칙으로 설정).
export const Route = createFileRoute("/ranking")({
  validateSearch: (s: Record<string, unknown>): { period?: Period; id?: string } => ({
    period: PERIODS.includes(s.period as Period) ? (s.period as Period) : undefined,
    id: typeof s.id === "string" && /^\d{4}-h[12]$/.test(s.id) ? s.id : undefined,
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(orpc.ranking.latest.queryOptions()),
      context.queryClient.ensureQueryData(orpc.ranking.history.queryOptions()),
    ]),
  head: () => ({ meta: [{ title: "공동주택 하자 판정 건수 상위 20개 건설사 · 순살시공" }] }),
  component: Ranking,
});

function Ranking() {
  const { period = "5y", id } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <article className="max-w-3xl">
      <PageHeader
        title="하자 판정 건수 상위 20개 건설사"
        lead="국토교통부가 반기마다 공개하는 명단입니다. 최근 5년 누계, 최근 6개월, 지난 발표를 볼 수 있습니다."
      />
      <RankingBoard
        view={{ period, id }}
        onChange={(v) => void navigate({ search: v, replace: true })}
      />
      <ButtonLink to="/search" variant="accent" className="mt-8">
        우리 아파트 시공사 확인하기
      </ButtonLink>
      <AdSlot name="landing" />
    </article>
  );
}
