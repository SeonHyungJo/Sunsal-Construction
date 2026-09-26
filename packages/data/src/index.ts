// 순위·별칭은 레포 JSON을 Worker에 번들한다. 단지 데이터는 D1(apps/api/migrations)에 있다.
import h1_2026 from "../data/announcements/2026-h1.json" with { type: "json" };
import aliasJson from "../data/builder-aliases.json" with { type: "json" };
import sampleJson from "../data/sample-complexes.json" with { type: "json" };
import { normalizeCompanyName } from "./company.ts";
import { parseAliases, parseAnnouncement } from "./snapshot.ts";

export { normalizeCompanyName };

/** 검색 비교용: NFKC·소문자·공백 제거 ("광교중앙로 100" = "광교중앙로100") */
export const norm = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");

/** D1 complexes.search_text 값 */
export const searchText = (c: Pick<Complex, "name" | "roadAddress" | "legalAddress">) =>
  norm(`${c.name}${c.roadAddress ?? ""}${c.legalAddress ?? ""}`);

export type Complex = {
  kaptCode: string;
  name: string;
  roadAddress: string | null;
  legalAddress: string | null;
  builderRaw: string | null;
  approvalDate: string | null; // YYYY-MM-DD
  syncedAt: string | null; // K-apt 기본정보 마지막 수집 (ISO)
};
export type ComplexDataset = { generatedAt: string | null; items: Complex[] };

/** 새 발표를 추가하면 여기에 import를 더한다. publishedOn이 가장 최근인 발표를 쓴다. */
const announcements = [h1_2026].map(parseAnnouncement);
const latest = announcements.sort((a, b) => b.publishedOn.localeCompare(a.publishedOn))[0]!;

export const ranking = {
  announcement: {
    id: latest.id,
    title: latest.title,
    periodStart: latest.periodStart,
    periodEnd: latest.periodEnd,
    publishedOn: latest.publishedOn,
    sourceUrl: latest.sourceUrl,
  },
  rows: latest.rows.map((r) => ({
    ...r,
    note: r.note ?? null,
    companyKey: normalizeCompanyName(r.companyName),
  })),
};

/** 정규화한 별칭 → 정규화한 발표 회사 키 */
export const aliases: ReadonlyMap<string, string> = new Map(
  parseAliases(aliasJson).map((a) => [
    normalizeCompanyName(a.alias),
    normalizeCompanyName(a.company),
  ]),
);

/** 로컬 개발·테스트용 가상 단지 (pnpm db:seed:local) */
export const sampleComplexes = sampleJson as ComplexDataset;
