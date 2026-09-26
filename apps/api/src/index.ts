import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { sendDailyReport } from "./report.ts";
import { router } from "./router.ts";
import { syncBasis, syncList } from "./sync.ts";

// wrangler.jsonc triggers.crons(최상위·env.production)와 같게 유지한다. (UTC)
const JOBS: Record<string, (env: Env) => Promise<unknown>> = {
  "0 18 * * *": (env) => withKey(env, (key) => syncList(env.DB, key)), // 03:00 KST 단지 목록
  "*/6 * * * *": (env) => withKey(env, (key) => syncBasis(env.DB, key)), // 단지 기본정보 20건
  "0 1 * * *": (env) => sendDailyReport(env), // 10:00 KST 일간 리포트
  "30 1 * * *": (env) => sendDailyReport(env), // 10:30 KST 재시도 (이미 보냈으면 건너뜀)
};

async function withKey(env: Env, job: (key: string) => Promise<unknown>) {
  if (!env.DATA_GO_KR_KEY) return console.log("DATA_GO_KR_KEY 미설정, 단지 동기화 건너뜀");
  await job(env.DATA_GO_KR_KEY);
}

const rpc = new RPCHandler(router, {
  // 입력값(검색어에 주소가 들어 있다)은 남기지 않고 오류 이름·메시지만 기록한다.
  interceptors: [onError((e) => console.error(e instanceof Error ? `${e.name}: ${e.message}` : e))],
});

const app = new Hono<{ Bindings: Env }>();

const PUBLIC_PATHS = [
  "/",
  "/ranking",
  "/search",
  "/methodology",
  "/checklist",
  "/corrections",
  "/privacy",
];

// 요청 도메인을 그대로 쓰므로 배포 도메인이 바뀌어도 설정할 것이 없다.
app.get("/robots.txt", (c) => {
  const origin = new URL(c.req.url).origin;
  return c.text(`User-agent: *\nAllow: /\nDisallow: /rpc/\n\nSitemap: ${origin}/sitemap.xml\n`);
});

app.get("/sitemap.xml", (c) => {
  const origin = new URL(c.req.url).origin;
  const urls = PUBLIC_PATHS.map((p) => `<url><loc>${origin}${p}</loc></url>`).join("");
  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    200,
    {
      "content-type": "application/xml",
    },
  );
});

// oRPC가 body를 직접 읽으므로 이 앞에 body를 소비하는 미들웨어를 두지 않는다.
app.use("/rpc/*", async (c, next) => {
  const { matched, response } = await rpc.handle(c.req.raw, {
    prefix: "/rpc",
    context: {
      env: c.env,
      ip: c.req.header("cf-connecting-ip") ?? "unknown",
      authorization: c.req.header("authorization"),
      waitUntil: (p) => c.executionCtx.waitUntil(p),
    },
  });
  if (matched) return c.newResponse(response.body, response);
  await next();
});

export default {
  fetch: app.fetch,
  async scheduled(controller, env, ctx) {
    const job = JOBS[controller.cron];
    if (!job) return console.error(`unknown cron: ${controller.cron}`);
    ctx.waitUntil(job(env));
  },
} satisfies ExportedHandler<Env>;
