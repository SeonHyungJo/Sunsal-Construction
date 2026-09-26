import { z } from "zod";

const row = z.object({
  rank: z.int().min(1).max(20),
  companyName: z.string().min(1),
  caseCount: z.int().nonnegative(),
  defectCount: z.int().nonnegative(),
  note: z.string().optional(),
});

type Row = z.infer<typeof row>;
const rows = z.array(row).min(1).max(20);

/** 공동 순위 규칙: 판정 건수 내림차순, 같은 건수는 같은 순위, 다음 순위는 앞선 회사 수 + 1 */
function checkRanks(list: Row[], ctx: z.RefinementCtx, label: string) {
  list.forEach((r, i) => {
    const expected = list.findIndex((x) => x.defectCount === r.defectCount) + 1;
    if (r.rank !== expected)
      ctx.addIssue({
        code: "custom",
        message: `${label} ${r.companyName}: rank ${r.rank} ≠ ${expected}`,
      });
    if (i > 0 && list[i - 1]!.defectCount < r.defectCount)
      ctx.addIssue({
        code: "custom",
        message: `${label} ${r.companyName}: 판정 건수 내림차순 아님`,
      });
  });
}

const announcement = z
  .object({
    id: z.string().regex(/^\d{4}-h[12]$/),
    title: z.string().min(1),
    periodStart: z.iso.date(),
    periodEnd: z.iso.date(),
    publishedOn: z.iso.date(),
    sourceUrl: z.url(),
    sourceTable: z.string().min(1),
    rows, // 최근 6개월
    /** 같은 발표의 최근 5년 누계 표 (3차 발표부터 제공) */
    cumulative: z
      .object({
        periodStart: z.iso.date(),
        periodEnd: z.iso.date(),
        sourceTable: z.string().min(1),
        rows,
      })
      .optional(),
  })
  .superRefine((a, ctx) => {
    checkRanks(a.rows, ctx, "6개월");
    if (a.cumulative) checkRanks(a.cumulative.rows, ctx, "5년");
  });

const aliases = z.array(
  z.object({ alias: z.string().min(1), company: z.string().min(1), evidence: z.string().min(1) }),
);

export const parseAnnouncement = (json: unknown) => announcement.parse(json);
export const parseAliases = (json: unknown) => aliases.parse(json);

const reviewNames = z.array(z.object({ name: z.string().min(1), reason: z.string().min(1) }));
export const parseReviewNames = (json: unknown) => reviewNames.parse(json);

const distinctNames = z.array(
  z.object({ name: z.string().min(1), notSameAs: z.string().min(1), evidence: z.string().min(1) }),
);
export const parseDistinctNames = (json: unknown) => distinctNames.parse(json);
