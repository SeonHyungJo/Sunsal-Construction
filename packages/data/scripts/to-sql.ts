// 단지 JSON({ items: Complex[] }) → D1 upsert SQL.
// 로컬 샘플:  pnpm db:seed:local
// 수집분 이관: node packages/data/scripts/to-sql.ts <file.json> > /tmp/c.sql && wrangler d1 execute sunsal --remote --file /tmp/c.sql
import { readFileSync } from "node:fs";
import { type ComplexDataset, searchText } from "../src/index.ts";

const file = process.argv[2];
if (!file) throw new Error("사용: node to-sql.ts <file.json>");
const { items }: ComplexDataset = JSON.parse(readFileSync(file, "utf8"));
const q = (v: string | null) => (v == null ? "NULL" : `'${v.replaceAll("'", "''")}'`);
const listedAt = new Date().toISOString();

for (const c of items) {
  console.log(
    `INSERT INTO complexes (kapt_code, name, road_address, legal_address, builder_raw, approval_date, synced_at, attempted_at, listed_at, search_text) VALUES (${[
      c.kaptCode,
      c.name,
      c.roadAddress,
      c.legalAddress,
      c.builderRaw,
      c.approvalDate,
      c.syncedAt,
      c.syncedAt,
      listedAt,
      searchText(c),
    ]
      .map(q)
      .join(
        ", ",
      )}) ON CONFLICT (kapt_code) DO UPDATE SET name = excluded.name, road_address = excluded.road_address, legal_address = excluded.legal_address, builder_raw = excluded.builder_raw, approval_date = excluded.approval_date, synced_at = excluded.synced_at, attempted_at = excluded.attempted_at, search_text = excluded.search_text WHERE excluded.synced_at IS NOT NULL OR complexes.synced_at IS NULL;`,
  );
}
