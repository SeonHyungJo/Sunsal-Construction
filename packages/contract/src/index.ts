import { oc, type ContractRouterClient } from "@orpc/contract";
import { z } from "zod";

export const contract = {
  health: oc.output(z.object({ ok: z.literal(true) })),
};

export type Client = ContractRouterClient<typeof contract>;
