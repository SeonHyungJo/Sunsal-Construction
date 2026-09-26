// 검수된 발표 스냅샷과 별칭을 DB에 반영한다. 같은 발표를 다시 넣으면 순위 행을 통째로 교체한다.
// 사용: DATABASE_URL=... pnpm db:seed          (운영: 발표·별칭만)
//       pnpm db:seed --sample                    (로컬: 샘플 단지 추가)
import { readdirSync, readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import {
  announcements,
  builderAliases,
  complexes,
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
    await tx.insert(rankingRows).values(
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

  if (process.argv.includes("--sample")) {
    const day = 24 * 60 * 60 * 1000;
    const samples: ({ stale?: boolean } & typeof complexes.$inferInsert)[] =
      read("sample-complexes.json");
    const rows = samples.map(({ stale, ...c }) => {
      const synced = c.roadAddress ? new Date(Date.now() - (stale ? 90 : 1) * day) : null;
      return { ...c, basisAttemptedAt: synced, basisSyncedAt: synced, basisChangedAt: synced };
    });
    await tx.delete(complexes).where(sql`${complexes.kaptCode} like 'A9%'`);
    await tx.insert(complexes).values(rows);
    console.log(`sample complexes: ${rows.length}`);
  }
});

await db.$client.end();
