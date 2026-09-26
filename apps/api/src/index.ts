import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createDb, type Db } from "@sunsal/db";
import { Hono } from "hono";
import { sendDailyReport } from "./report.ts";
import { router } from "./router.ts";
import { syncBasis, syncList } from "./sync.ts";

// wrangler.jsonc triggers.crons · alchemy.run.ts crons와 같게 유지한다. (UTC)
const JOBS: Record<string, (db: Db, env: Env) => Promise<unknown>> = {
  "0 18 * * *": (db, env) =>
    env.DATA_GO_KR_KEY ? syncList(db, env.DATA_GO_KR_KEY) : skip("kapt_list"), // 03:00 KST
  "*/10 * * * *": (db, env) =>
    env.DATA_GO_KR_KEY ? syncBasis(db, env.DATA_GO_KR_KEY) : skip("kapt_basis"),
  "0 1 * * *": (db, env) => sendDailyReport(db, env), // 10:00 KST
  "30 1 * * *": (db, env) => sendDailyReport(db, env), // 10:30 KST 재시도 (이미 보냈으면 건너뜀)
};

async function skip(job: string) {
  console.log(`${job}: DATA_GO_KR_KEY 미설정, 건너뜀`);
}

const rpc = new RPCHandler(router, {
  // 입력값(검색어에 주소가 들어 있다)은 남기지 않고 오류 이름·메시지만 기록한다.
  interceptors: [onError((e) => console.error(e instanceof Error ? `${e.name}: ${e.message}` : e))],
});

const app = new Hono<{ Bindings: Env }>();

// oRPC가 body를 직접 읽으므로 이 앞에 body를 소비하는 미들웨어를 두지 않는다.
app.use("/rpc/*", async (c, next) => {
  const db = createDb(c.env.HYPERDRIVE.connectionString);
  try {
    const { matched, response } = await rpc.handle(c.req.raw, {
      prefix: "/rpc",
      context: {
        db,
        env: c.env,
        ip: c.req.header("cf-connecting-ip") ?? "unknown",
        authorization: c.req.header("authorization"),
        waitUntil: (p) => c.executionCtx.waitUntil(p),
      },
    });
    if (matched) return c.newResponse(response.body, response);
    await next();
  } finally {
    c.executionCtx.waitUntil(db.$client.end());
  }
});

export default {
  fetch: app.fetch,
  async scheduled(controller, env, ctx) {
    const job = JOBS[controller.cron];
    if (!job) return console.error(`unknown cron: ${controller.cron}`);
    const db = createDb(env.HYPERDRIVE.connectionString);
    ctx.waitUntil(job(db, env).finally(() => db.$client.end()));
  },
} satisfies ExportedHandler<Env>;
