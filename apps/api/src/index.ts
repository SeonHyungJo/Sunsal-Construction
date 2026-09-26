import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { createDb } from "@sunsal/db";
import { Hono } from "hono";
import { router } from "./router.ts";
import { syncBasis, syncList } from "./sync.ts";

export const CRON_KAPT_LIST = "0 18 * * *"; // 매일 03:00 KST
export const CRON_KAPT_BASIS = "*/10 * * * *";

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
      context: { db, env: c.env, ip: c.req.header("cf-connecting-ip") ?? "unknown" },
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
    const db = createDb(env.HYPERDRIVE.connectionString);
    const job = controller.cron === CRON_KAPT_LIST ? syncList : syncBasis;
    ctx.waitUntil(job(db, env.DATA_GO_KR_KEY).finally(() => db.$client.end()));
  },
} satisfies ExportedHandler<Env>;
