import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { Client } from "@sunsal/contract";

const link = new RPCLink({ url: `${location.origin}/rpc` });

export const client: Client = createORPCClient(link);
export const orpc = createTanstackQueryUtils(client);
