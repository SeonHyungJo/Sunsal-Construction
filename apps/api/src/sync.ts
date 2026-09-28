// K-apt → D1 동기화 (Worker cron). 호출 제한에 걸리면 그 회차를 멈추고 다음 회차가 이어간다.
import { searchText } from "@sunsal/data";
import { builderNames } from "./builders.ts";
import { fetchBasis, fetchListPage, ThrottledError } from "./kapt.ts";

const now = () => new Date().toISOString();

/**
 * 전체 단지 목록 upsert (매일 1회, 약 23회 호출). 목록에서 빠진 단지는 지우지 않는다.
 * 기본정보를 아직 못 받은 단지는 목록의 단지명으로 검색되게 한다.
 */
export async function syncList(db: D1Database, key: string) {
  let total = 0;
  try {
    for (let page = 1; ; page++) {
      const { items, totalCount } = await fetchListPage(key, page);
      if (!items.length) break;
      const at = now();
      await db.batch(
        items.map((i) =>
          db
            .prepare(
              `INSERT INTO complexes (kapt_code, name, listed_at, search_text) VALUES (?1, ?2, ?3, ?4)
               ON CONFLICT (kapt_code) DO UPDATE SET listed_at = excluded.listed_at,
                 name = CASE WHEN complexes.synced_at IS NULL THEN excluded.name ELSE complexes.name END,
                 search_text = CASE WHEN complexes.synced_at IS NULL THEN excluded.search_text ELSE complexes.search_text END`,
            )
            .bind(
              i.kaptCode,
              i.kaptName,
              at,
              searchText({ name: i.kaptName, roadAddress: null, legalAddress: null }),
            ),
        ),
      );
      total += items.length;
      if (total >= totalCount) break;
    }
    console.log(`kapt_list: ${total}건`);
  } catch (e) {
    if (!(e instanceof ThrottledError)) throw e;
    console.log(`kapt_list: 호출 제한으로 중단 (${total}건까지), 내일 다시 시도`);
  }
}

/**
 * 가장 오래전에 시도한 단지부터 기본정보를 받는다. 실패한 단지는 오류만 기록하고 기존 값을 유지한다.
 * ponytail: 6분마다 20건 = 하루 4,800건 (개발계정 5,000건). 운영계정 증량 후 batch를 올린다.
 */
export async function syncBasis(db: D1Database, key: string, batch = 20) {
  const { results } = await db
    .prepare(
      "SELECT kapt_code, name FROM complexes ORDER BY attempted_at IS NOT NULL, attempted_at LIMIT ?",
    )
    .bind(batch)
    .all<{ kapt_code: string; name: string }>();

  const writes: D1PreparedStatement[] = [];
  let ok = 0,
    failed = 0,
    throttled = false;
  for (const c of results) {
    const at = now();
    try {
      const b = await fetchBasis(key, c.kapt_code);
      const name = b.name || c.name;
      writes.push(
        db
          .prepare(
            `UPDATE complexes SET name = ?2, road_address = ?3, legal_address = ?4, builder_raw = ?5, approval_date = ?6,
               synced_at = ?7, attempted_at = ?7, error = NULL, search_text = ?8 WHERE kapt_code = ?1`,
          )
          .bind(
            c.kapt_code,
            name,
            b.roadAddress,
            b.legalAddress,
            b.builderRaw,
            b.approvalDate,
            at,
            searchText({ ...b, name }),
          ),
        db.prepare("DELETE FROM complex_builders WHERE kapt_code = ?").bind(c.kapt_code),
        ...builderNames(b.builderRaw).map((n) =>
          db
            .prepare("INSERT INTO complex_builders (name, kapt_code) VALUES (?, ?)")
            .bind(n, c.kapt_code),
        ),
      );
      ok++;
    } catch (e) {
      if (e instanceof ThrottledError) {
        throttled = true;
        break; // 이 단지는 시도로 치지 않고 다음 회차에 먼저 받는다
      }
      failed++;
      writes.push(
        db
          .prepare("UPDATE complexes SET attempted_at = ?2, error = ?3 WHERE kapt_code = ?1")
          .bind(c.kapt_code, at, String(e).slice(0, 300)),
      );
    }
  }
  if (writes.length) await db.batch(writes);
  console.log(`kapt_basis: 성공 ${ok} · 실패 ${failed}${throttled ? " · 호출 제한으로 중단" : ""}`);
}
