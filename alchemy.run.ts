import alchemy from "alchemy";
import { Hyperdrive, RateLimit, Vite } from "alchemy/cloudflare";

const app = await alchemy("sunsal");

// Supabase Postgres 연결 문자열 (Session pooler 또는 direct). 스테이지별로 다른 Supabase 프로젝트를 쓴다.
const db = await Hyperdrive("db", {
  name: `sunsal-${app.stage}`,
  origin: alchemy.secret(process.env.DATABASE_URL),
});

export const site = await Vite("site", {
  name: `sunsal-${app.stage}`,
  entrypoint: "apps/api/src/index.ts",
  assets: { directory: "apps/web/dist/client", run_worker_first: ["/rpc/*", "/api/*"] },
  spa: true,
  compatibility: "node",
  crons: ["0 18 * * *", "*/10 * * * *"], // apps/api/src/index.ts의 CRON_* 와 같게
  bindings: {
    HYPERDRIVE: db,
    SEARCH_LIMITER: RateLimit({ namespace_id: 1001, simple: { limit: 30, period: 60 } }),
    DATA_GO_KR_KEY: alchemy.secret(process.env.DATA_GO_KR_KEY),
  },
});

console.log(site.url);

await app.finalize();
