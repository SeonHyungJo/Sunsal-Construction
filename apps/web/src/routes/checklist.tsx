import { createFileRoute } from "@tanstack/react-router";
import { Prose } from "../components/Prose";

export const Route = createFileRoute("/checklist")({
  head: () => ({ meta: [{ title: "사전점검·하자 기록 체크리스트 · 순살시공" }] }),
  component: Checklist,
});

function Checklist() {
  return (
    <Prose
      title="사전점검·하자 기록 체크리스트"
      lead="하자를 발견했을 때 나중에 증빙이 되도록 기록하는 방법입니다."
    >
      <h2>기록할 때</h2>
      <ul>
        <li>날짜가 보이게 사진·영상을 찍고, 줄자나 동전을 함께 두어 크기를 남깁니다.</li>
        <li>위치(동·호수·방·벽면)와 처음 발견한 날짜를 적어 둡니다.</li>
        <li>
          누수·결로는 시간대와 날씨를 함께 기록하고, 번지는 모습을 며칠 간격으로 다시 찍습니다.
        </li>
      </ul>
      <h2>자주 판정되는 하자 유형</h2>
      <p>
        국토교통부 발표 기준 주요 유형은 기능 불량, 들뜸·탈락, 균열, 결로, 누수, 오염·변색 순입니다.
      </p>
      <ul>
        <li>기능 불량: 조명, 주방 후드, 인터폰, 위생설비 작동</li>
        <li>들뜸·탈락: 타일, 도배, 바닥재, 가구</li>
        <li>균열·누수·결로: 벽·천장 모서리, 창호 주변, 욕실·발코니</li>
      </ul>
      <h2>공식 경로</h2>
      <ol>
        <li>사업주체(시행사·시공사)에 하자보수를 서면으로 청구하고 사본을 보관합니다.</li>
        <li>
          해결되지 않으면{" "}
          <a href="https://www.adc.go.kr" target="_blank" rel="noopener noreferrer">
            하자심사·분쟁조정위원회
          </a>
          에 하자심사나 분쟁조정을 신청할 수 있습니다. 하자로 판정되면 사업주체는 60일 이내 보수하고
          결과를 하자관리정보시스템에 등록해야 합니다.
        </li>
      </ol>
      <p className="text-sm text-ink-3">
        이 안내는 일반 정보이며 법률 자문이 아닙니다. 구체적인 절차는 위원회 안내를 확인하세요.
      </p>
    </Prose>
  );
}
