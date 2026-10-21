import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ranking } from "@sunsal/data";
import { Hono } from "hono";
import { render } from "web/server";
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

// 대표 도메인은 duruit.com 하나 (canonical·사이트맵과 같게).
const SITE = "https://duruit.com";
app.use(async (c, next) => {
  const url = new URL(c.req.url);
  if (url.hostname !== "www.duruit.com") return next();
  return c.redirect(SITE + url.pathname + url.search, 301);
});

const PUBLIC_PATHS = [
  "/",
  "/ranking",
  "/search",
  "/builders",
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
  const builders = [
    ...new Set([...ranking.rows, ...(ranking.cumulative?.rows ?? [])].map((r) => r.companyKey)),
  ];
  const urls = [...PUBLIC_PATHS, ...builders.map((k) => `/builder/${encodeURIComponent(k)}`)]
    .map((p) => `<url><loc>${origin}${p}</loc></url>`)
    .join("");
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

// 화면 경로는 서버에서 본문까지 그려 보낸다. 파일(ads.txt 등)은 정적 자산 그대로.
app.get("*", async (c) => {
  // URL만 넘긴다: 브라우저의 If-None-Match가 붙으면 본문 없는 304가 와서 빈 페이지가 된다.
  const asset = await c.env.ASSETS.fetch(c.req.url);
  if (!asset.headers.get("content-type")?.includes("text/html")) return asset;
  const url = new URL(c.req.url);
  const page = await render(url.pathname + url.search, (req) => rpcFetch(req, c.env)).catch(
    (e: unknown) => (console.error("SSR", e instanceof Error ? e.message : e), null),
  );
  if (!page) return asset; // 서버 렌더링이 실패해도 빈 화면 대신 기존 SPA로
  const res = new HTMLRewriter()
    .on("#root", { element: (e) => void e.setInnerContent(page.html, { html: true }) })
    .on("title", { element: (e) => void (page.title && e.setInnerContent(page.title)) })
    .on('meta[name="description"]', {
      element: (e) => void (page.description && e.setAttribute("content", page.description)),
    })
    .on("head", {
      element: (e) =>
        void e.append(`<link rel="canonical" href="${url.origin}${url.pathname}">`, { html: true }),
    })
    .transform(asset);
  return new Response(res.body, { status: page.status, headers: res.headers });
});

async function rpcFetch(req: Request, env: Env) {
  const { response } = await rpc.handle(req, {
    prefix: "/rpc",
    context: { env, ip: "ssr", authorization: undefined, waitUntil: () => {} },
  });
  return response ?? new Response(null, { status: 404 });
}

export default {
  fetch: app.fetch,
  async scheduled(controller, env, ctx) {
    const job = JOBS[controller.cron];
    if (!job) return console.error(`unknown cron: ${controller.cron}`);
    ctx.waitUntil(job(env));
  },
} satisfies ExportedHandler<Env>;
