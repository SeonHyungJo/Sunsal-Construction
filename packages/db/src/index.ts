import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export * from "./schema.ts";
export { normalizeCompanyName } from "./company.ts";

// Hyperdrive가 풀링하므로 요청마다 만들고 버린다. prepare: false는 트랜잭션 풀러 호환용.
export function createDb(connectionString: string) {
  return drizzle(postgres(connectionString, { max: 5, prepare: false }), {
    schema,
    casing: "snake_case",
  });
}

export type Db = ReturnType<typeof createDb>;
