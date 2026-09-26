import { oc, type ContractRouterClient } from "@orpc/contract";
import { z } from "zod";

const announcement = z.object({
  id: z.string(),
  title: z.string(),
  periodStart: z.string(), // YYYY-MM-DD
  periodEnd: z.string(),
  publishedOn: z.string(),
  sourceUrl: z.string(),
});

/** 발표 원문의 회사 단위 수치. 특정 단지의 하자 건수가 아니다. */
const rankedCompany = z.object({
  rank: z.number(),
  companyName: z.string(),
  companyDefectCount: z.number(), // 집계 기간 내 회사 전체 하자판정 세부 하자수
  companyCaseCount: z.number(), // 집계 기간 내 회사 전체 하자판정 사건수
  note: z.string().nullable(),
});

const complexSummary = z.object({
  kaptCode: z.string(),
  name: z.string(),
  roadAddress: z.string().nullable(),
  legalAddress: z.string().nullable(),
  approvalDate: z.string().nullable(),
});

export const builderMatch = z.discriminatedUnion("status", [
  z.object({ status: z.literal("listed"), company: rankedCompany }),
  z.object({ status: z.literal("not_listed") }), // 공개된 상위 20개사 명단에 없음
  z.object({
    status: z.literal("needs_review"),
    reason: z.enum(["multiple_builders", "similar_name"]),
  }),
  z.object({ status: z.literal("unknown") }), // 단지 데이터에 시공사 정보 없음
]);

export const contract = {
  health: oc.output(z.object({ ok: z.literal(true) })),

  ranking: {
    latest: oc.output(z.object({ announcement, companies: z.array(rankedCompany) }).nullable()),
  },

  complex: {
    search: oc
      .input(z.object({ q: z.string().max(100) }))
      .errors({ RATE_LIMITED: { status: 429 } })
      .output(
        z.discriminatedUnion("status", [
          z.object({ status: z.literal("ok"), items: z.array(complexSummary) }),
          z.object({ status: z.literal("too_short") }),
        ]),
      ),

    result: oc
      .input(z.object({ kaptCode: z.string().regex(/^[A-Z0-9]{6,12}$/) }))
      .errors({ NOT_FOUND: { status: 404 } })
      .output(
        z.object({
          complex: complexSummary.extend({ builderRaw: z.string().nullable() }),
          match: builderMatch,
          announcement: announcement.nullable(),
          complexDataSyncedAt: z.string().nullable(), // K-apt 기본정보 마지막 수집 시각 (ISO)
          complexDataStale: z.boolean(), // 수집 이력이 없거나 오래됨
        }),
      ),
  },
};

export type Client = ContractRouterClient<typeof contract>;
export type BuilderMatch = z.infer<typeof builderMatch>;
