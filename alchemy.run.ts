import alchemy from "alchemy";
import { Vite } from "alchemy/cloudflare";

const app = await alchemy("sunsal");

export const site = await Vite("site", {
  name: `sunsal-${app.stage}`,
  entrypoint: "apps/api/src/index.ts",
  assets: { directory: "apps/web/dist/client", run_worker_first: ["/rpc/*", "/api/*"] },
  spa: true,
  compatibility: "node",
  bindings: {
    SUPABASE_URL: process.env.SUPABASE_URL ?? "",
    SUPABASE_SERVICE_ROLE_KEY: alchemy.secret(process.env.SUPABASE_SERVICE_ROLE_KEY),
  },
});

console.log(site.url);

await app.finalize();
