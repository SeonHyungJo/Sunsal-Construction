// K-apt 공동주택 기본정보 → data/complexes.json. 기존 파일을 캐시로 써서 증분 갱신한다.
// 사용: DATA_GO_KR_KEY=... pnpm data:sync [--budget 4000]
// - 목록(전체 단지 코드)은 매번 새로 받는다. 목록을 끝까지 받은 경우에만 사라진 단지를 뺀다.
// - 기본정보는 새 단지 → 오래 전에 수집한 단지 순으로 budget 건만 호출한다 (개발계정 일 5,000건).
// - 호출이 실패한 단지는 이전 값을 그대로 둔다.
import { readFileSync, writeFileSync } from "node:fs";
import type { Complex, ComplexDataset } from "../src/index.ts";
import { fetchBasis, fetchListPage, type KaptListItem } from "./kapt.ts";

const key = process.env.DATA_GO_KR_KEY;
if (!key) throw new Error("DATA_GO_KR_KEY가 필요합니다");
const budgetArg = process.argv.indexOf("--budget");
const budget = budgetArg > 0 ? Number(process.argv[budgetArg + 1]) : 4000;

const file = new URL("../data/complexes.json", import.meta.url);
const prev: ComplexDataset = JSON.parse(readFileSync(file, "utf8"));
const byCode = new Map(prev.items.map((c) => [c.kaptCode, c]));

// 1. 목록
const listed: KaptListItem[] = [];
let listComplete = false;
try {
  for (let page = 1; ; page++) {
    const { items, totalCount } = await fetchListPage(key, page);
    listed.push(...items);
    if (items.length === 0 || listed.length >= totalCount) break;
  }
  listComplete = true;
  console.log(`목록 ${listed.length}건`);
} catch (e) {
  console.error(`목록 수집 중단 (${listed.length}건까지): ${String(e)}`);
}
for (const i of listed) {
  const c = byCode.get(i.kaptCode);
  if (c) c.name = c.syncedAt ? c.name : i.kaptName;
  else
    byCode.set(i.kaptCode, {
      kaptCode: i.kaptCode,
      name: i.kaptName,
      roadAddress: null,
      legalAddress: null,
      builderRaw: null,
      approvalDate: null,
      syncedAt: null,
    });
}
if (listComplete) {
  const live = new Set(listed.map((i) => i.kaptCode));
  for (const code of byCode.keys()) if (!live.has(code)) byCode.delete(code);
}

// 2. 기본정보
const queue = [...byCode.values()]
  .sort((a, b) => (a.syncedAt ?? "").localeCompare(b.syncedAt ?? ""))
  .slice(0, budget);
let ok = 0,
  failed = 0,
  streak = 0;
for (const [i, c] of queue.entries()) {
  if (i > 0 && i % 500 === 0)
    console.log(`기본정보 ${i}/${queue.length} (성공 ${ok} · 실패 ${failed})`);
  try {
    const b = await fetchBasis(key, c.kaptCode);
    Object.assign(c, {
      name: b.name || c.name,
      roadAddress: b.roadAddress,
      legalAddress: b.legalAddress,
      builderRaw: b.builderRaw,
      approvalDate: b.approvalDate,
      syncedAt: new Date().toISOString(),
    } satisfies Partial<Complex>);
    ok++;
    streak = 0;
  } catch (e) {
    failed++;
    // 한도 초과·인증 오류처럼 전부 실패하는 상황이면 멈춘다.
    if (++streak >= 5) {
      console.error(`연속 실패로 중단: ${String(e)}`);
      break;
    }
  }
}

if (listed.length === 0 && ok === 0) {
  console.error("받은 데이터가 없어 complexes.json을 그대로 둡니다.");
  process.exit(1);
}

const items = [...byCode.values()].sort((a, b) => a.kaptCode.localeCompare(b.kaptCode));
writeFileSync(
  file,
  // 한 단지 = 한 줄: git diff로 변경 단지를 볼 수 있게
  `{"generatedAt":${JSON.stringify(new Date().toISOString())},"items":[\n${items.map((c) => JSON.stringify(c)).join(",\n")}\n]}\n`,
);
const pending = items.filter((c) => !c.syncedAt).length;
console.log(
  `단지 ${items.length} · 기본정보 성공 ${ok} · 실패 ${failed} · 미수집 ${pending}${listComplete ? "" : " · 목록 불완전"}`,
);
