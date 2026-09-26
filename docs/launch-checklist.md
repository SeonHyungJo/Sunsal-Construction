# 출시 점검표 (SSC-19)

샘플 데이터 기준 개발 검증은 끝났다. 아래 **[계정]** 항목은 실제 계정·키를 연결한 뒤 확인하며, 확인 전까지 미완료로 둔다.

## 1. 환경 연결

| 값                                                                                                 | 위치                      | 용도                             |
| -------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------- |
| `DATA_GO_KR_KEY`                                                                                   | Worker secret (등록 완료) | 단지 동기화 cron                 |
| `ADMIN_TOKEN`                                                                                      | `.env` / `.dev.vars`      | 정정 요청 검토 API               |
| `GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN`, `GA4_PROPERTY_ID`, `ADSENSE_ACCOUNT_ID`                   | `.env`                    | 일간 리포트 지표                 |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`                                                           | `.env`                    | 일간 리포트·정정 요청 알림       |
| `VITE_SITE_URL`, `VITE_GTM_ID`, `VITE_ADSENSE_CLIENT`, `VITE_ADSENSE_SLOT_*`, `VITE_CONTACT_EMAIL` | 빌드 환경변수             | canonical·OG, 분석, 광고, 문의처 |

배포: `pnpm deploy` → D1 마이그레이션(`apps/api/migrations`) 적용 후 wrangler `env.production` (Worker + D1 `sunsal` + KV `sunsal-store` + 커스텀 도메인 `sunsal.duruit.com`). Worker secret(`ADMIN_TOKEN`, `GOOGLE_*`, `GA4_PROPERTY_ID`, `ADSENSE_ACCOUNT_ID`, `TELEGRAM_*`)은 `npx wrangler secret put <이름> --env production`으로 넣는다. 운영 빌드의 `VITE_SITE_URL`은 `apps/web/.env.production`.

## 2. 데이터

- [x] 국토부 2026-h1 표 1~20위·건수 원문 대조 (`packages/data/src/snapshot.test.ts`)
- [ ] [계정] K-apt 실수집 후 표본 단지 10곳의 주소·시공사 원문·사용승인일을 K-apt 사이트와 대조
- [ ] [계정] 20개사 관련 시공사 원문 표기 분포를 뽑아 별칭 검토 (`builder-aliases.json`)
- [ ] [계정] 대표 주소·오타·동명 단지 검색 점검 (서울·부산·경기 각 3곳)
- [ ] 7차('26 하반기) 발표 여부 확인 — 하자심사·분쟁조정위원회 누리집 게시로 바뀜

## 3. 화면 (샘플 데이터로 확인 완료)

- [x] 320·390·768·1440px 11개 화면 가로 넘침 없음 (`node scripts/responsive-check.mjs`)
- [x] 결과 4상태(명단 포함·명단 밖·매칭 확인 필요·시공사 없음)와 데이터 지연 표시
- [x] 키보드만으로 검색 → 후보 선택 → 결과 이동, dataLayer에 검색어 없음
- [ ] [계정] 실제 모바일 브라우저(iOS Safari, Android Chrome)에서 검색·공유 확인

## 4. 광고·분석·알림

- [ ] [계정] AdSense — **partner@duruit.com** 게시자 `pub-3934630227671332` 가입 완료, ads.txt·메타·`VITE_ADSENSE_CLIENT` 반영 → 게시자 ID를 `apps/web/.env.production`·`public/ads.txt`·`index.html` 메타에 반영 → `duruit.com` 등록(AdSense는 최상위 도메인 단위, 하위 도메인 포함)·검토 → 승인 후 광고 단위·`/complex/*` Offerwall
- [ ] [계정] 광고 차단 브라우저에서 결과가 그대로 보이는지
- [ ] [계정] AdSense "개인정보 보호 및 메시지"에서 EEA·영국·스위스 동의 메시지 게시 (개인정보처리방침 문구와 일치)
- [x] GTM(`GTM-WKBFBCB3`)·GA4(`G-B5BZ9YBS0F`) 연결, 운영 hit·실시간 보고서에서 이벤트·UTM 확인
- [x] Google OAuth(partner@duruit.com, 내부 앱 `sunsal-reporting`)·Telegram(@sunsal_report_bot) 연결, 실제 API로 리포트 발송 확인 (2026-09-26)
- [ ] [계정] 수익이 생긴 뒤 전일 추정 수익을 AdSense 보고서 화면과 대조
- [ ] [계정] 10:00·10:30 cron이 같은 날 한 번만 발송하는지 (KV `report:*`)
- [ ] [계정] 카카오톡·페이스북·X 링크 미리보기 (OG 이미지·제목)

## 5. 운영 절차

- **정정 요청 처리**: Telegram 알림 → `POST /rpc/correction/review` (`Authorization: Bearer $ADMIN_TOKEN`, `{"json":{"id":"…","status":"applied","resolution":"…"}}`) → 데이터 수정은 JSON(`packages/data/data/`) 변경 후 `pnpm deploy`.
- **새 국토부 발표**: `packages/data/data/announcements/{yyyy}-h{n}.json` 추가 + `packages/data/src/index.ts`에 import → 테스트 통과 → `pnpm deploy`.
- **단지 데이터 갱신**: Worker cron이 자동 수행 (목록 매일 03:00 KST, 기본정보 6분마다 20건 ≈ 하루 4,800건). 진행 확인: `wrangler d1 execute sunsal --remote --env production --command "SELECT count(*), sum(synced_at IS NOT NULL) FROM complexes"`, 로그는 `wrangler tail --env production`. 호출 제한(HTTP_ERROR)이면 그 회차만 멈추고 다음 회차가 이어간다.
- **리포트 미발송**: KV `report:{YYYY-MM-DD}`의 status(failed·not_configured)와 Worker 로그 확인.

## 6. 기록

| 항목        | 값                                                                                                                                                             |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 배포 URL    | (배포 후 기록)                                                                                                                                                 |
| 검증일      | (배포 후 기록)                                                                                                                                                 |
| 알려진 한계 | 순위는 상위 20개사만, 회사 단위 수치 · 공동시공·유사 표기는 순위 미표시 · K-apt 미등록 단지는 검색 불가 · 개발계정 일 5,000건 한도로 전체 단지 재수집에 약 6일 |
