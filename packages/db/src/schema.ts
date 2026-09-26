// 앱 테이블 스키마의 단일 SoT. 변경 후 `pnpm db:gen`으로 SQL 마이그레이션을 만든다.
// 모든 테이블은 RLS를 켜고 anon/authenticated 정책을 두지 않는다. 읽기·쓰기는 Worker의 DB 직접 연결(Hyperdrive)로만 한다.
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigserial,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** 국토부 하자 판정 상위 건설사 발표 단위 스냅샷 */
export const announcements = pgTable("announcements", {
  id: text().primaryKey(), // 예: 2026-h1
  title: text().notNull(),
  periodStart: date().notNull(),
  periodEnd: date().notNull(),
  publishedOn: date().notNull(),
  sourceUrl: text().notNull(),
}).enableRLS();

/** 발표별 순위 행. 발표된 상위 20개사만 저장하고 21위 이하는 만들지 않는다. */
export const rankingRows = pgTable(
  "ranking_rows",
  {
    announcementId: text()
      .notNull()
      .references(() => announcements.id, { onDelete: "cascade" }),
    companyKey: text().notNull(), // normalizeCompanyName(companyName)
    rank: integer().notNull(),
    companyName: text().notNull(), // 발표 원문 표기
    defectCount: integer().notNull(), // 하자판정건수 · 세부 하자수
    caseCount: integer().notNull(), // 하자판정건수 · 사건수
    note: text(), // 원문 각주 (예: ㈜라인건설을 포함한 자료임)
  },
  (t) => [primaryKey({ columns: [t.announcementId, t.companyKey] })],
).enableRLS();

/**
 * 단지 데이터의 시공사 표기 → 발표 회사 키. 사람이 검토한 행만 넣는다.
 * 정규화 후 완전히 같은 이름은 별칭 없이 매칭되므로 표기가 다른 경우만 등록한다.
 */
export const builderAliases = pgTable("builder_aliases", {
  alias: text().primaryKey(), // normalizeCompanyName(표기)
  companyKey: text().notNull(),
  evidence: text().notNull(),
}).enableRLS();

/** 주소 검색 대상 문자열. 검색 쿼리는 인덱스와 같은 식을 써야 trigram 인덱스를 탄다. */
export const complexSearchText = (t: {
  name: AnyPgColumn;
  roadAddress: AnyPgColumn;
  legalAddress: AnyPgColumn;
}) =>
  sql`coalesce(${t.name}, '') || ' ' || coalesce(${t.roadAddress}, '') || ' ' || coalesce(${t.legalAddress}, '')`;

/** K-apt 공동주택 기본정보 */
export const complexes = pgTable(
  "complexes",
  {
    kaptCode: text().primaryKey(),
    name: text().notNull(),
    bjdCode: text(),
    sido: text(),
    sigungu: text(),
    eupmyeondong: text(),
    // 아래는 기본정보(getAphusBassInfoV5) 수집 후 채워진다.
    legalAddress: text(),
    roadAddress: text(),
    builderRaw: text(), // 시공사 원문
    developerRaw: text(), // 시행사 원문
    approvalDate: date(), // 사용승인일
    households: integer(),
    listedAt: timestamp({ withTimezone: true }).notNull().defaultNow(), // 목록에서 마지막으로 확인한 시각
    basisAttemptedAt: timestamp({ withTimezone: true }), // 기본정보 마지막 수집 시도 (순환 순서 기준)
    basisSyncedAt: timestamp({ withTimezone: true }), // 기본정보 마지막 성공 수집
    basisChangedAt: timestamp({ withTimezone: true }), // 기본정보 값이 마지막으로 바뀐 시각
    basisError: text(), // 마지막 수집 실패 사유. 성공 시 null
  },
  (t) => [
    index("complexes_basis_attempted_at_idx").on(t.basisAttemptedAt),
    index("complexes_search_trgm_idx").using("gin", sql`(${complexSearchText(t)}) gin_trgm_ops`),
  ],
).enableRLS();

/** 동기화 실행 이력 */
export const syncRuns = pgTable("sync_runs", {
  id: bigserial({ mode: "number" }).primaryKey(),
  job: text().notNull(), // kapt_list | kapt_basis
  startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp({ withTimezone: true }),
  ok: integer().notNull().default(0),
  changed: integer().notNull().default(0),
  failed: integer().notNull().default(0),
  error: text(),
}).enableRLS();

/**
 * 순위·시공사 매칭·단지 정보 정정 요청. 접수(received) → 검토(reviewing) → 반영(applied) 또는 반려(rejected).
 * message·contact는 공개하지 않는다.
 */
export const correctionRequests = pgTable(
  "correction_requests",
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: text().notNull(), // builder_match | ranking | complex | other
    kaptCode: text(),
    message: text().notNull(),
    contact: text(),
    status: text().notNull().default("received"),
    resolution: text(), // 반영 내용 또는 반려 사유 (공개)
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("correction_requests_status_updated_idx").on(t.status, t.updatedAt)],
).enableRLS();

/** Telegram 일간 리포트 발송 기록. report_date당 한 번만 보낸다. */
export const dailyReports = pgTable("daily_reports", {
  reportDate: date().primaryKey(), // KST 기준 집계일
  status: text().notNull(), // sent | failed | not_configured
  message: text().notNull(),
  attempts: integer().notNull().default(0),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
