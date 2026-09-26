import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { router } from "./router";

const rpc = new RPCHandler(router);

const app = new Hono<{ Bindings: Env }>();

// oRPC가 body를 직접 읽으므로 이 앞에 body를 소비하는 미들웨어를 두지 않는다.
app.use("/rpc/*", async (c, next) => {
  const { matched, response } = await rpc.handle(c.req.raw, {
    prefix: "/rpc",
    context: { env: c.env },
  });
  if (matched) return c.newResponse(response.body, response);
  await next();
});

export default app;
