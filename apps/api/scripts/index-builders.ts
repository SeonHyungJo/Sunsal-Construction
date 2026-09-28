// 이미 수집된 단지의 complex_builders를 다시 채운다 (0002 마이그레이션 직후, 또는 builders.ts 규칙을 바꾼 뒤).
//   wrangler d1 execute sunsal --remote --json --command "SELECT kapt_code, builder_raw FROM complexes WHERE builder_raw IS NOT NULL" > rows.json
//   node apps/api/scripts/index-builders.ts rows.json > builders.sql
//   wrangler d1 execute sunsal --remote --file builders.sql
import { readFileSync } from "node:fs";
import { builderNames } from "../src/builders.ts";

const file = process.argv[2];
if (!file) throw new Error("사용: node index-builders.ts <rows.json>");
const [{ results }]: [{ results: { kapt_code: string; builder_raw: string }[] }] = JSON.parse(
  readFileSync(file, "utf8"),
);
const q = (v: string) => `'${v.replaceAll("'", "''")}'`;

// 단지마다 지우고 다시 넣는다. 전체 삭제는 실행 중 cron이 넣은 행까지 지운다.
for (const r of results) {
  console.log(`DELETE FROM complex_builders WHERE kapt_code = ${q(r.kapt_code)};`);
  for (const n of builderNames(r.builder_raw))
    console.log(
      `INSERT INTO complex_builders (name, kapt_code) VALUES (${q(n)}, ${q(r.kapt_code)});`,
    );
}
