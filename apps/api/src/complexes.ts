// D1 complexes 테이블 접근. 검색은 FTS5 trigram으로 후보를 좁힌 뒤 search.ts 순위 로직을 그대로 쓴다.
import { type Complex, norm } from "@sunsal/data";
import { createSearch } from "./search.ts";

type Row = {
  kapt_code: string;
  name: string;
  road_address: string | null;
  legal_address: string | null;
  builder_raw: string | null;
  approval_date: string | null;
  synced_at: string | null;
};

const COLUMNS =
  "c.kapt_code, c.name, c.road_address, c.legal_address, c.builder_raw, c.approval_date, c.synced_at";
const toComplex = (r: Row): Complex => ({
  kaptCode: r.kapt_code,
  name: r.name,
  roadAddress: r.road_address,
  legalAddress: r.legal_address,
  builderRaw: r.builder_raw,
  approvalDate: r.approval_date,
  syncedAt: r.synced_at,
});

const CANDIDATES = 200;
const quote = (t: string) => `"${t.replaceAll('"', '""')}"`;

export async function hasComplexes(db: D1Database) {
  return (await db.prepare("SELECT 1 FROM complexes LIMIT 1").first()) !== null;
}

/** 기본정보(주소) 수집 진행률. 일간 리포트용 */
export async function syncProgress(db: D1Database) {
  return db
    .prepare(
      "SELECT count(*) AS total, count(synced_at) AS synced, count(error) AS errored FROM complexes",
    )
    .first<{ total: number; synced: number; errored: number }>();
}

export async function getComplex(db: D1Database, kaptCode: string) {
  const r = await db
    .prepare(`SELECT ${COLUMNS} FROM complexes c WHERE c.kapt_code = ?`)
    .bind(kaptCode)
    .first<Row>();
  return r && toComplex(r);
}

export async function searchComplexes(db: D1Database, query: string, limit = 10) {
  const tokens = query.split(/\s+/).map(norm).filter(Boolean);
  const long = tokens.filter((t) => t.length >= 3); // trigram은 3글자 이상만 색인된다
  const short = tokens.filter((t) => t.length < 3);

  const where: string[] = [];
  const params: string[] = [];
  if (long.length) {
    where.push("complexes_fts MATCH ?");
    params.push(long.map(quote).join(" AND "));
  }
  for (const t of short) {
    where.push("c.search_text LIKE ?");
    params.push(`%${t}%`);
  }
  if (!where.length) return [];
  where.push("c.name NOT GLOB '테스트*'"); // K-apt 목록에 섞인 시험용 단지 (기본정보 없음)

  const from = long.length
    ? "complexes_fts f JOIN complexes c ON c.rowid = f.rowid"
    : "complexes c";
  const sql = `SELECT ${COLUMNS} FROM ${from} WHERE ${where.join(" AND ")} LIMIT ${CANDIDATES}`;
  let rows = (
    await db
      .prepare(sql)
      .bind(...params)
      .all<Row>()
  ).results;

  // 일치가 없으면 오타 후보: 검색어의 trigram 중 하나라도 겹치는 단지를 모아 유사도로 고른다.
  const whole = tokens.join("");
  if (!rows.length && whole.length >= 3) {
    const grams = [
      ...new Set(Array.from({ length: whole.length - 2 }, (_, i) => whole.slice(i, i + 3))),
    ];
    rows = (
      await db
        .prepare(
          `SELECT ${COLUMNS} FROM complexes_fts f JOIN complexes c ON c.rowid = f.rowid WHERE complexes_fts MATCH ? AND c.name NOT GLOB '테스트*' LIMIT ${CANDIDATES}`,
        )
        .bind(grams.map(quote).join(" OR "))
        .all<Row>()
    ).results;
  }
  return createSearch(rows.map(toComplex))(query, limit);
}

/** 이 이름들로 시공한 단지, 사용승인일 최신순 (날짜 없는 단지는 뒤로) */
export async function builderComplexes(
  db: D1Database,
  names: readonly string[],
  limit: number,
  offset: number,
) {
  const inList = names.map(() => "?").join(", ");
  const [total, rows] = await Promise.all([
    db
      .prepare(
        `SELECT count(DISTINCT kapt_code) AS n FROM complex_builders WHERE name IN (${inList})`,
      )
      .bind(...names)
      .first<{ n: number }>(),
    db
      .prepare(
        `SELECT DISTINCT ${COLUMNS} FROM complex_builders b JOIN complexes c ON c.kapt_code = b.kapt_code
         WHERE b.name IN (${inList})
         ORDER BY c.approval_date IS NULL, c.approval_date DESC, c.name LIMIT ? OFFSET ?`,
      )
      .bind(...names, limit, offset)
      .all<Row>(),
  ]);
  return { total: total?.n ?? 0, items: rows.results.map(toComplex) };
}

/**
 * 시공사 이름 부분 일치. 이름별 단지 수를 돌려주고, 별칭 묶기는 호출하는 쪽에서 한다.
 * ponytail: LIKE 전체 탐색(수만 행). 느려지면 complex_builders에 trigram FTS를 붙인다.
 */
export async function searchBuilderNames(db: D1Database, normalized: string) {
  const { results } = await db
    .prepare(
      "SELECT name, count(*) AS n FROM complex_builders WHERE name LIKE ? GROUP BY name ORDER BY n DESC LIMIT 50",
    )
    .bind(`%${normalized.replaceAll(/[%_]/g, "")}%`)
    .all<{ name: string; n: number }>();
  return results;
}
