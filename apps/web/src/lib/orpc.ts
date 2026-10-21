import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { Client } from "@sunsal/contract";

// 서버 렌더링(Worker)에서는 네트워크를 타지 않고 같은 Worker의 RPC 핸들러를 직접 부른다 (src/server.tsx).
let serverFetch: ((req: Request) => Promise<Response>) | undefined;
export const setServerFetch = (f: (req: Request) => Promise<Response>) => (serverFetch = f);

const link = new RPCLink({
  url: () => `${globalThis.location?.origin ?? "http://ssr"}/rpc`,
  fetch: (req, init) => (serverFetch ? serverFetch(req) : fetch(req, init)),
});

export const client: Client = createORPCClient(link);
export const orpc = createTanstackQueryUtils(client);
