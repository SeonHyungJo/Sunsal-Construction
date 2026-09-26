import alchemy from "alchemy";
import { Hyperdrive, RateLimit, Vite } from "alchemy/cloudflare";

const app = await alchemy("sunsal");

// 설정된 값만 바인딩한다. 비어 있으면 Worker에서 해당 기능이 "미설정"으로 동작한다.
const secrets = (names: string[]) =>
  Object.fromEntries(
    names.filter((n) => process.env[n]).map((n) => [n, alchemy.secret(process.env[n])]),
  );

// Supabase Postgres 연결 문자열 (Session pooler 또는 direct). 스테이지별로 다른 Supabase 프로젝트를 쓴다.
const db = await Hyperdrive("db", {
  name: `sunsal-${app.stage}`,
  origin: alchemy.secret(process.env.DATABASE_URL),
});

export const site = await Vite("site", {
  name: `sunsal-${app.stage}`,
  entrypoint: "apps/api/src/index.ts",
  assets: {
    directory: "apps/web/dist/client",
    run_worker_first: ["/rpc/*", "/robots.txt", "/sitemap.xml"],
  },
  spa: true,
  compatibility: "node",
  crons: ["0 18 * * *", "*/10 * * * *", "0 1 * * *", "30 1 * * *"], // apps/api/src/index.ts JOBS와 같게
  bindings: {
    HYPERDRIVE: db,
    SEARCH_LIMITER: RateLimit({ namespace_id: 1001, simple: { limit: 30, period: 60 } }),
    CORRECTION_LIMITER: RateLimit({ namespace_id: 1002, simple: { limit: 3, period: 60 } }),
    ...secrets([
      "DATA_GO_KR_KEY",
      "ADMIN_TOKEN",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "GOOGLE_REFRESH_TOKEN",
      "GA4_PROPERTY_ID",
      "ADSENSE_ACCOUNT_ID",
      "TELEGRAM_BOT_TOKEN",
      "TELEGRAM_CHAT_ID",
    ]),
  },
});

console.log(site.url);

await app.finalize();
