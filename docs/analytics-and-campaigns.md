# 분석(GTM·GA4)과 SNS 캠페인

## 원칙

- GA4로 보내는 값은 `apps/web/src/lib/track.ts`의 이벤트·파라미터 타입만 허용한다. 주소, 검색어, 동·호수, 전화번호, 이메일은 보내지 않는다.
- URL에 검색어를 두지 않는다. 결과 URL은 `/complex/{단지코드}`, 정정 요청은 `?kaptCode=&kind=&id=`뿐이다.
- 공유 버튼은 `origin + pathname`만 복사한다(UTM·검색 파라미터 제거).

## 앱이 보내는 dataLayer 이벤트

| 이벤트                 | 파라미터                                                | 시점                    |
| ---------------------- | ------------------------------------------------------- | ----------------------- |
| `page_view`            | `page_path`                                             | SPA 경로 변경마다       |
| `address_search_start` | `location` (landing·search)                             | 검색창 첫 입력          |
| `complex_selected`     | `candidate_count`                                       | 후보에서 단지 선택      |
| `result_view`          | `match_status` (listed·not_listed·needs_review·unknown) | 결과 화면 진입          |
| `builder_match_failed` | `reason` (multiple_builders·similar_name·unknown)       | 매칭 불확실·시공사 없음 |
| `ranking_expand`       | —                                                       | 전체 20위 보기          |
| `source_open`          | `location`                                              | 국토부 원문 링크 클릭   |
| `correction_submit`    | `kind`                                                  | 정정 요청 접수          |
| `share`                | `method` (native·copy)                                  | 결과 링크 공유          |

일간 Telegram 리포트(`apps/api/src/google.ts`)는 `address_search_start`, `complex_selected`, `result_view`와 `sessionDefaultChannelGroup`(Organic/Paid Social), `sessionCampaignName`을 읽는다.

## GTM·GA4 설정 (운영 연결 완료)

| 항목         | 값                                                                                 |
| ------------ | ---------------------------------------------------------------------------------- |
| GTM 컨테이너 | `GTM-WKBFBCB3` (sunsal.duruit.com, partner@duruit.com의 duruit 계정) — 버전 2 게시 |
| GA4 속성     | `556065304` 순살시공, 웹 스트림 측정 ID `G-B5BZ9YBS0F`                             |
| 빌드 변수    | `apps/web/.env.production`의 `VITE_GTM_ID`                                         |

- 컨테이너 구성의 기준은 **`docs/gtm/sunsal-container.json`** 이다. 태그·트리거를 바꿀 때는 이 파일을 고친 뒤 GTM 관리 → 컨테이너 가져오기(병합, 충돌 덮어쓰기) → 게시한다.
  - Google 태그(`send_page_view: false` — 앱이 page_view를 직접 보냄), `GA4 - page_view`, `GA4 - 서비스 이벤트`(위 표의 이벤트, 정규식 트리거), 데이터 영역 변수 7개
- GA4 맞춤 측정기준(이벤트): `match_status`, `reason`, `location`, `method`, `kind` / 맞춤 측정항목: `candidate_count`
- Google 신호 꺼짐, 세분화된 위치·기기 데이터 수집 꺼짐
- 검증(2026-09-26): 운영에서 GA4 hit 확인 — 이벤트 전송, UTM 캠페인 인식, 검색어·동호수 미포함. GA4 실시간 보고서에 서비스 이벤트 표시

## UTM 규칙

```
?utm_source={플랫폼}&utm_medium={social|paid_social}&utm_campaign={훅}_{YYMMDD}&utm_content={형식}
```

| 항목           | 값                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------- |
| `utm_source`   | `instagram`, `youtube`, `threads`, `x`, `naver_blog`, `kakao`                                |
| `utm_medium`   | 자연 게시물 `social`, 유료 `paid_social` (GA4 기본 채널 그룹의 Organic/Paid Social로 분류됨) |
| `utm_campaign` | `builder20_260930`, `brand_vs_builder_260930`, `precheck3_260930` (훅 + 게시일)              |
| `utm_content`  | `card`, `short`, `reel`, `post`                                                              |

예: `https://{도메인}/?utm_source=instagram&utm_medium=social&utm_campaign=builder20_260930&utm_content=card`

## 게시물 소재 3종 (기획 문서 훅 1~3)

모든 소재는 "국토교통부 공식 발표 기준", "회사 전체의 6개월 판정 건수이며 개별 단지 하자 여부가 아님"을 본문에 넣는다. 특정 단지를 부실시공으로 단정하지 않는다.

### 1. `builder20` — 우리 아파트 시공사, 국토부 하자 판정 상위 20곳에 있을까?

- 카드 1: 제목 + "국토교통부 2026년 상반기 공개 자료"
- 카드 2~~3: 1~~5위 회사명·판정 건수 (집계 기간 2025.09~2026.02 표기)
- 카드 4: "명단에 없다고 하자가 없다는 뜻은 아닙니다" + 해석 한 줄
- 카드 5: CTA "주소로 우리 아파트 시공사 확인" → 랜딩 (`utm_content=card`)

### 2. `brand_vs_builder` — 브랜드는 아는데 실제 시공사는 어디일까?

- 숏폼 15~20초: 아파트 브랜드명 ≠ 시공 법인일 수 있음 → 주소 검색 화면 녹화 → 결과의 "시공사(단지 정보 원문)" 강조
- 설명란: 데이터 출처(K-apt 공동주택 기본정보), 링크 → `/search` (`utm_content=short`)

### 3. `precheck3` — 새 아파트 사전점검, 벽지보다 먼저 볼 곳 3곳

- 카드/릴스: 발표 기준 주요 하자 유형(기능 불량, 들뜸·탈락, 균열) 기준 점검 위치 3곳 → 기록 방법
- 마지막 장: 체크리스트 `/checklist` → 주소 검색 유도 (`utm_content=reel`)

게시물별 비교 지표: 세션, `address_search_start`/세션, `result_view`/`address_search_start`. 광고 활성화 후에는 Offerwall 노출·선택률을 AdSense 보고서에서 함께 본다.
