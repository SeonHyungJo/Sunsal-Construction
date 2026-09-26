import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Prose } from "../components/Prose";
import { SourceLine } from "../components/SourceLine";
import { orpc } from "../lib/orpc";

export const Route = createFileRoute("/methodology")({
  loader: ({ context }) => context.queryClient.ensureQueryData(orpc.ranking.latest.queryOptions()),
  head: () => ({ meta: [{ title: "순위 기준·출처·한계 · 순살시공" }] }),
  component: Methodology,
});

function Methodology() {
  const { data } = useQuery(orpc.ranking.latest.queryOptions());
  return (
    <Prose
      title="순위 기준·출처·한계"
      lead="순살시공이 보여주는 숫자가 무엇을 뜻하고, 무엇을 뜻하지 않는지 정리했습니다."
    >
      <h2>순위는 무엇을 기준으로 하나요</h2>
      <p>
        국토교통부가 반기마다 공개하는 「공동주택 하자 판정 상위 20개 건설사 명단」 중{" "}
        <strong>최근 6개월 하자 판정 건수</strong> 기준 표를 그대로 옮깁니다. 건수는
        하자심사·분쟁조정위원회가 실제 하자로 판정한 <strong>세부 하자수</strong>이며, 판정 사건수는
        함께 표시합니다. 같은 건수는 같은 순위입니다. 같은 발표에 실린{" "}
        <strong>최근 5년 누계</strong> 상위 20개사 표도 함께 보여줍니다(전체 순위 화면의 탭, 결과
        화면의 두 번째 항목).
      </p>
      {data && <SourceLine announcement={data.announcement} location="methodology" />}

      <h2>이 숫자가 뜻하지 않는 것</h2>
      <ul>
        <li>회사 전체의 기간별 판정 건수입니다. 검색한 단지의 하자 건수가 아닙니다.</li>
        <li>
          회사 전체의 시공 품질이나 개별 단지의 안전성을 판정하지 않습니다. 공급 물량이 많은 회사는
          건수가 많을 수 있습니다.
        </li>
        <li>
          발표는 상위 20개사만 공개합니다. 명단에 없는 회사는{" "}
          <strong>「공개된 상위 20개사 명단에 없음」</strong>으로만 표시하며, 21위 이하 순위를
          만들지 않습니다.
        </li>
        <li>연중 누계가 아니라 발표별 집계 기간(6개월)의 수치입니다.</li>
      </ul>

      <h2>단지와 시공사는 어떻게 연결하나요</h2>
      <ol>
        <li>
          국토교통부 공동주택 기본정보(K-apt) OpenAPI로 단지명·주소·사용승인일·시공사 원문을
          주기적으로 수집합니다.
        </li>
        <li>
          시공사 원문에서 법인 형태 표기(주식회사, (주) 등)와 공백만 정리해 발표 명단의 회사명과{" "}
          <strong>정확히 같을 때</strong>, 또는 사람이 근거를 확인한 별칭(예: 발표 각주의 합산
          법인)일 때만 순위를 연결합니다.
        </li>
        <li>
          여러 회사가 함께 시공했거나, 이름이 비슷하기만 한 경우에는{" "}
          <strong>「시공사 매칭 확인 필요」</strong>로 표시하고 순위를 붙이지 않습니다. 단순 문자열
          유사도로 자동 확정하지 않습니다.
        </li>
      </ol>

      <h2>언제 갱신되나요</h2>
      <p>
        순위는 새 발표가 나오면 원문 표와 각주를 사람이 대조한 뒤 교체합니다. 단지 정보는 매일
        목록을 확인하고 단지별 상세 정보를 순서대로 다시 받아오며, 결과 화면에 마지막 수집일을
        표시합니다.
      </p>

      <h2>틀린 정보를 발견했다면</h2>
      <p>
        <Link to="/corrections">정정 요청</Link>으로 알려주세요. 접수 번호로 처리 상태를 확인할 수
        있고, 반영하거나 반려한 요청은 사유와 함께 <Link to="/corrections">처리 이력</Link>에
        공개합니다.
      </p>
    </Prose>
  );
}
