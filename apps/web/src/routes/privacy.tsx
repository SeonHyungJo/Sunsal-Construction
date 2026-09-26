import { createFileRoute, Link } from "@tanstack/react-router";
import { Prose } from "../components/Prose";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "개인정보처리방침·광고 안내 · 순살시공" }] }),
  component: Privacy,
});

const contact = import.meta.env.VITE_CONTACT_EMAIL;

function Privacy() {
  return (
    <Prose
      title="개인정보처리방침·광고 안내"
      lead="순살시공은 회원가입 없이 이용하는 서비스이며, 필요한 최소한의 정보만 다룹니다."
    >
      <h2>서비스 소개</h2>
      <p>
        국토교통부가 공개한 공동주택 하자 판정 상위 건설사 명단과 공동주택 기본정보를 연결해 주소로
        시공사 정보를 찾을 수 있게 하는 개인 운영 서비스입니다. 공공기관의 공식 서비스가 아닙니다.
      </p>

      <h2>처리하는 정보와 보관 기간</h2>
      <ul>
        <li>
          <strong>주소 검색어</strong>: 단지 후보를 찾는 데만 쓰고 저장하지 않습니다. 서버 로그와
          방문 분석에도 남기지 않습니다. 동·호수는 입력하지 않아도 되며, 입력해도 검색 전에
          지웁니다.
        </li>
        <li>
          <strong>접속 IP</strong>: 과도한 요청을 막기 위한 요청 수 제한에 일시적으로 쓰고 저장하지
          않습니다. 호스팅(Cloudflare) 제공자가 보안 목적으로 접속 기록을 처리할 수 있습니다.
        </li>
        <li>
          <strong>정정 요청</strong>: 요청 유형, 대상 단지 코드, 요청 내용, 선택 입력한 이메일을
          보관합니다. 처리 완료(반영·반려) 1년 뒤 요청 내용과 이메일을 삭제하고, 공개 처리
          이력(유형·처리 내용·날짜)만 남깁니다.
        </li>
      </ul>

      <h2>방문 분석 (Google 태그 관리자·Google 애널리틱스 4)</h2>
      <p>
        방문 수, 유입 경로(SNS 캠페인 등), 기기 유형, 순위 보기·주소 검색 시작·단지 선택·결과 열람
        같은 화면 이용 이벤트를 쿠키로 익명 집계합니다. 주소, 검색어, 동·호수, 연락처는 보내지
        않습니다. 원하지 않으면{" "}
        <a
          href="https://tools.google.com/dlpage/gaoptout"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google 애널리틱스 차단 부가기능
        </a>
        을 쓰거나 브라우저에서 쿠키를 차단할 수 있습니다.
      </p>

      <h2>광고 (Google 애드센스)</h2>
      <p>
        이 사이트는 Google 애드센스 광고를 게재합니다. Google과 협력사는 쿠키를 사용해 이 사이트와
        다른 사이트 방문 기록을 바탕으로 광고를 보여줄 수 있습니다. 맞춤 광고는{" "}
        <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
          Google 광고 설정
        </a>
        에서 끌 수 있으며, 자세한 내용은{" "}
        <a
          href="https://policies.google.com/technologies/ads"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google 광고 정책
        </a>
        을 참고하세요.
      </p>
      <p>
        주소 검색 결과 화면에는 방문자가 원할 때 광고를 보고 이용하는 보상형 광고(Offerwall)가
        표시될 수 있습니다. 광고를 클릭할 필요는 없으며, 광고가 표시되지 않거나 차단된 경우에도
        결과는 그대로 볼 수 있습니다. 유럽경제지역·영국·스위스 방문자에게는 Google 동의 관리
        메시지로 쿠키 사용 동의를 받습니다.
      </p>

      <h2>문의·정정</h2>
      <p>
        데이터 오류는 <Link to="/corrections">정정 요청</Link>으로, 그 밖의 문의
        {contact ? (
          <>
            는 <a href={`mailto:${contact}`}>{contact}</a>로
          </>
        ) : (
          "도 정정 요청의 '기타'로"
        )}{" "}
        보내 주세요.
      </p>
      <p className="text-sm text-ink-3">시행일 2026년 9월 26일</p>
    </Prose>
  );
}
