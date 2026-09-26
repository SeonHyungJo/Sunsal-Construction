# 순살시공

공식 공동주택 하자 판정 순위와 주소 기반 시공사 조회 웹서비스. 기준 스펙: Obsidian `Project Common/Dev Spec.md`, 기획: `순살시공/순살시공 서비스 기획.md`.

## 구조

```
apps/web        Vite + React + TanStack Router/Query + Tailwind 4 (SPA)
apps/api        Cloudflare Worker (Hono + oRPC): 검색·결과 API, K-apt 동기화·일간 리포트 cron
packages/contract  oRPC 계약 (Zod)
packages/db     Drizzle 스키마·SQL 마이그레이션, 국토부 발표 스냅샷(data/), 시드
```

## 로컬 개발 (샘플 데이터)

```sh
supabase start                       # 로컬 Postgres (54322)
pnpm install
pnpm db:migrate && pnpm db:seed:sample
cp .dev.vars.example .dev.vars       # 비워두면 외부 연동은 "미설정"으로 동작
pnpm dev                             # http://localhost:5173 (웹 + Worker)
```

cron 수동 실행: `curl "localhost:5173/cdn-cgi/handler/scheduled?cron=0+1+*+*+*"` (일간 리포트)

## 검증

```sh
pnpm typecheck && pnpm lint
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres pnpm test   # DB 통합 테스트 포함
pnpm build
node scripts/responsive-check.mjs    # pnpm dev 실행 중, 320~1440px 가로 넘침 검사
```

운영 연결·출시 점검은 [`docs/launch-checklist.md`](docs/launch-checklist.md), 분석·캠페인은 [`docs/analytics-and-campaigns.md`](docs/analytics-and-campaigns.md).
