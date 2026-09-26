import { implement } from "@orpc/server";
import { contract } from "@sunsal/contract";

const os = implement(contract).$context<{ env: Env }>();

export const router = os.router({
  health: os.health.handler(() => ({ ok: true as const })),
});
