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
    // 로컬 D1·KV 상태를 루트 wrangler CLI(pnpm db:*)와 공유한다
    cloudflare({
      configPath: "../../wrangler.jsonc",
      persistState: { path: "../../.wrangler/state" },
    }),
  ],
});
