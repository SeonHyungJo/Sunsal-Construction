// 검수된 발표 스냅샷과 별칭을 DB에 반영한다. 같은 발표를 다시 넣으면 순위 행을 통째로 교체한다.
// 사용: DATABASE_URL=... pnpm db:seed
import { readdirSync, readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import {
  announcements,
  builderAliases,
  createDb,
  normalizeCompanyName,
  rankingRows,
} from "../src/index.ts";
import { parseAnnouncement, parseAliases } from "../src/snapshot.ts";

const dir = new URL("../data/", import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(new URL(path, dir), "utf8"));

const db = createDb(
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
);

await db.transaction(async (tx) => {
  for (const file of readdirSync(new URL("announcements/", dir))) {
    const a = parseAnnouncement(read(`announcements/${file}`));
    const { rows, sourceTable: _, ...meta } = a;
    await tx
      .insert(announcements)
      .values(meta)
      .onConflictDoUpdate({ target: announcements.id, set: meta });
    await tx.delete(rankingRows).where(sql`${rankingRows.announcementId} = ${a.id}`);
    await tx
      .insert(rankingRows)
      .values(
        rows.map((r) => ({
          ...r,
          announcementId: a.id,
          companyKey: normalizeCompanyName(r.companyName),
        })),
      );
    console.log(`announcement ${a.id}: ${rows.length} rows`);
  }

  const aliases = parseAliases(read("builder-aliases.json"));
  await tx.delete(builderAliases);
  await tx.insert(builderAliases).values(
    aliases.map((x) => ({
      alias: normalizeCompanyName(x.alias),
      companyKey: normalizeCompanyName(x.company),
      evidence: x.evidence,
    })),
  );
  console.log(`aliases: ${aliases.length}`);
});

await db.$client.end();
