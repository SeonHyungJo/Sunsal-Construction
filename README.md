# 순살시공

공식 공동주택 하자 판정 순위와 주소 기반 시공사 조회 웹서비스. 기준 스펙: Obsidian `Project Common/Dev Spec.md`, 기획: `순살시공/순살시공 서비스 기획.md`.

## 구조

```
apps/web        Vite + React + TanStack Router/Query + Tailwind 4 (SPA)
apps/api        Cloudflare Worker (Hono + oRPC): 순위·검색·결과·정정 요청 API, K-apt 동기화·일간 리포트 cron, D1 마이그레이션
packages/contract  oRPC 계약 (Zod)
packages/data   순위 스냅샷·시공사 별칭(Worker 번들), 샘플 단지, JSON→D1 SQL 변환 스크립트
```

## 로컬 개발 (샘플 데이터)

Cloudflare만 쓴다: Worker(API·cron) + D1(단지 데이터, FTS5 trigram 검색) + KV(정정 요청·리포트 기록).

```sh
pnpm install
pnpm db:migrate:local && pnpm db:seed:local   # 로컬 D1 + 샘플 단지
cp .dev.vars.example .dev.vars                # 비워두면 외부 연동은 "미설정"으로 동작
pnpm dev                                      # http://localhost:5173 (웹 + Worker)
```

단지 데이터는 운영 Worker cron이 매일 목록(03:00 KST), 6분마다 기본정보 20건을 D1에 채운다 (`DATA_GO_KR_KEY` secret).

cron 수동 실행: `curl "localhost:5173/cdn-cgi/handler/scheduled?cron=0+1+*+*+*"` (일간 리포트), `cron=*/6+*+*+*+*` (단지 기본정보)

## 검증

```sh
pnpm typecheck && pnpm lint
pnpm test
pnpm build
node scripts/responsive-check.mjs    # pnpm dev 실행 중, 320~1440px 가로 넘침 검사
```

배포: `pnpm deploy` (= `build:prod` 운영 빌드 → `deploy:ci` D1 마이그레이션·배포) → https://sunsal.duruit.com. Cloudflare Workers Builds(Git 연동) 설정: 빌드 명령 `pnpm run build:prod`, 배포 명령 `pnpm run deploy:ci`. Worker secret은 `npx wrangler secret put <이름> --env production`. 운영 연결·출시 점검은 [`docs/launch-checklist.md`](docs/launch-checklist.md), 분석·캠페인은 [`docs/analytics-and-campaigns.md`](docs/analytics-and-campaigns.md).
