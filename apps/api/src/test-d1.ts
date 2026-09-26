/// <reference types="@cloudflare/workers-types" />
// 테스트용 D1: Node 내장 SQLite(FTS5 포함)에 마이그레이션을 적용한 메모리 DB.
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

export function testD1() {
  const sqlite = new DatabaseSync(":memory:");
  const dir = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(dir).sort()) sqlite.exec(readFileSync(new URL(f, dir), "utf8"));

  const statement = (sql: string, args: unknown[] = []) => ({
    bind: (...a: unknown[]) => statement(sql, a),
    all: async () => ({
      results: sqlite
        .prepare(sql)
        .all(...(args as never[]))
        .map((r) => ({ ...r })),
    }),
    first: async () => {
      const r = sqlite.prepare(sql).get(...(args as never[]));
      return r ? { ...r } : null;
    },
    run: async () => sqlite.prepare(sql).run(...(args as never[])),
  });
  const db = {
    prepare: (sql: string) => statement(sql),
    batch: async (stmts: ReturnType<typeof statement>[]) => {
      sqlite.exec("BEGIN");
      for (const s of stmts) await s.run();
      sqlite.exec("COMMIT");
      return [];
    },
  };
  return db as unknown as D1Database;
}
