// 서비스 데이터는 모두 레포의 JSON이다. Worker는 번들된 이 값을 시작 시 한 번 읽어 메모리에서 쓴다.
import h1_2026 from "../data/announcements/2026-h1.json" with { type: "json" };
import aliasJson from "../data/builder-aliases.json" with { type: "json" };
import complexJson from "../data/complexes.json" with { type: "json" };
import sampleJson from "../data/sample-complexes.json" with { type: "json" };
import { normalizeCompanyName } from "./company.ts";
import { parseAliases, parseAnnouncement } from "./snapshot.ts";

export { normalizeCompanyName };

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

export const complexes = complexJson as ComplexDataset;
/** 로컬 개발용 가상 단지. 운영(DATA_MODE 미설정)에서는 쓰지 않는다. */
export const sampleComplexes = sampleJson as ComplexDataset;
