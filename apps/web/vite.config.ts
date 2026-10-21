import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    // 로컬 D1·KV 상태를 루트 wrangler CLI(pnpm db:*)와 공유한다. 단위 테스트(vitest)에는 Worker가 필요 없다.
    !process.env.VITEST &&
      cloudflare({
        configPath: "../../wrangler.jsonc",
        persistState: { path: "../../.wrangler/state" },
      }),
  ],
});
