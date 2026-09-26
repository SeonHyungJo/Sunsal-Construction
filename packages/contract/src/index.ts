import { oc, type ContractRouterClient } from "@orpc/contract";
import { z } from "zod";
import { correctionKinds, correctionStatuses } from "./constants.ts";

export { correctionKinds, correctionStatuses };

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

/** 공개해도 되는 정정 요청 정보. 요청 본문·연락처는 포함하지 않는다. */
const correctionPublic = z.object({
  id: z.string(),
  kind: z.enum(correctionKinds),
  kaptCode: z.string().nullable(),
  status: z.enum(correctionStatuses),
  resolution: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const kaptCode = z.string().regex(/^[A-Z0-9]{6,12}$/);

export const contract = {
  health: oc.output(z.object({ ok: z.literal(true) })),

  ranking: {
    latest: oc.output(
      z
        .object({
          announcement,
          companies: z.array(rankedCompany), // 최근 6개월
          cumulative: z // 같은 발표의 최근 5년 누계
            .object({
              periodStart: z.string(),
              periodEnd: z.string(),
              companies: z.array(rankedCompany),
            })
            .nullable(),
        })
        .nullable(),
    ),
  },

  complex: {
    search: oc
      .input(z.object({ q: z.string().max(100) }))
      .errors({ RATE_LIMITED: { status: 429 } })
      .output(
        z.discriminatedUnion("status", [
          z.object({ status: z.literal("ok"), items: z.array(complexSummary) }),
          z.object({ status: z.literal("too_short") }),
          z.object({ status: z.literal("not_ready") }), // 단지 데이터 수집 전
        ]),
      ),

    result: oc
      .input(z.object({ kaptCode }))
      .errors({ NOT_FOUND: { status: 404 } })
      .output(
        z.object({
          complex: complexSummary.extend({ builderRaw: z.string().nullable() }),
          match: builderMatch,
          announcement: announcement.nullable(),
          complexDataSyncedAt: z.string().nullable(), // K-apt 기본정보 마지막 수집 시각 (ISO)
          complexDataStale: z.boolean(), // 수집 이력이 없거나 오래됨
          // 최근 5년 누계 명단 기준 (발표에 누계 표가 없으면 null)
          cumulative: z
            .object({ periodStart: z.string(), periodEnd: z.string(), match: builderMatch })
            .nullable(),
        }),
      ),
  },

  correction: {
    create: oc
      .input(
        z.object({
          kind: z.enum(correctionKinds),
          kaptCode: kaptCode.optional(),
          message: z.string().trim().min(10).max(2000),
          contact: z.string().trim().max(200).optional(), // 답변이 필요할 때만 (이메일 등)
        }),
      )
      .errors({ RATE_LIMITED: { status: 429 } })
      .output(z.object({ id: z.string() })),

    get: oc
      .input(z.object({ id: z.uuid() }))
      .errors({ NOT_FOUND: { status: 404 } })
      .output(correctionPublic),

    /** 처리 완료(반영·반려)된 정정 이력 */
    log: oc.output(z.array(correctionPublic)),

    /** 운영자 전용 (Authorization: Bearer ADMIN_TOKEN) */
    review: oc
      .input(
        z.object({
          id: z.uuid(),
          status: z.enum(correctionStatuses),
          resolution: z.string().trim().max(200).optional(), // KV metadata(1KB)에 들어가야 한다
        }),
      )
      .errors({ UNAUTHORIZED: { status: 401 }, NOT_FOUND: { status: 404 } })
      .output(correctionPublic),
  },
};

export type Client = ContractRouterClient<typeof contract>;
export type BuilderMatch = z.infer<typeof builderMatch>;
