# 순살시공

공식 공동주택 하자 판정 순위와 주소 기반 시공사 조회 웹서비스. 기준 스펙: Obsidian `Project Common/Dev Spec.md`, 기획: `순살시공/순살시공 서비스 기획.md`.

## 구조

```
apps/web        Vite + React + TanStack Router/Query + Tailwind 4 (SPA)
apps/api        Cloudflare Worker (Hono + oRPC): 순위·검색·결과·정정 요청 API, 일간 리포트 cron
packages/contract  oRPC 계약 (Zod)
packages/data   번들 데이터: 국토부 발표 스냅샷·시공사 별칭·K-apt 단지(complexes.json), 동기화 스크립트
```

## 로컬 개발 (샘플 데이터)

DB 없음. 순위·단지 데이터는 레포 JSON을 Worker에 번들하고, 정정 요청·리포트 기록만 Cloudflare KV에 둔다.

```sh
pnpm install
cp .dev.vars.example .dev.vars       # 비워두면 외부 연동은 "미설정"으로 동작
pnpm dev                             # http://localhost:5173 (웹 + Worker, 샘플 단지·로컬 KV)
```

단지 데이터 갱신: `DATA_GO_KR_KEY=… pnpm data:sync` → `packages/data/data/complexes.json` 커밋 → `pnpm deploy`

cron 수동 실행: `curl "localhost:5173/cdn-cgi/handler/scheduled?cron=0+1+*+*+*"` (일간 리포트)

## 검증

```sh
pnpm typecheck && pnpm lint
pnpm test
pnpm build
node scripts/responsive-check.mjs    # pnpm dev 실행 중, 320~1440px 가로 넘침 검사
```

배포: `pnpm deploy` (alchemy, stage prod → https://sunsal.duruit.com). 운영 연결·출시 점검은 [`docs/launch-checklist.md`](docs/launch-checklist.md), 분석·캠페인은 [`docs/analytics-and-campaigns.md`](docs/analytics-and-campaigns.md).
