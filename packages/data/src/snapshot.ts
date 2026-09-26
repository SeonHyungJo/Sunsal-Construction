import { z } from "zod";

const row = z.object({
  rank: z.int().min(1).max(20),
  companyName: z.string().min(1),
  caseCount: z.int().nonnegative(),
  defectCount: z.int().nonnegative(),
  note: z.string().optional(),
});

const announcement = z
  .object({
    id: z.string().regex(/^\d{4}-h[12]$/),
    title: z.string().min(1),
    periodStart: z.iso.date(),
    periodEnd: z.iso.date(),
    publishedOn: z.iso.date(),
    sourceUrl: z.url(),
    sourceTable: z.string().min(1),
    rows: z.array(row).min(1).max(20),
  })
  .superRefine((a, ctx) => {
    // 공동 순위 규칙: 판정 건수 내림차순, 같은 건수는 같은 순위, 다음 순위는 앞선 회사 수 + 1
    a.rows.forEach((r, i) => {
      const expected = a.rows.findIndex((x) => x.defectCount === r.defectCount) + 1;
      if (r.rank !== expected)
        ctx.addIssue({ code: "custom", message: `${r.companyName}: rank ${r.rank} ≠ ${expected}` });
      if (i > 0 && a.rows[i - 1]!.defectCount < r.defectCount)
        ctx.addIssue({ code: "custom", message: `${r.companyName}: 판정 건수 내림차순 아님` });
    });
  });

const aliases = z.array(
  z.object({ alias: z.string().min(1), company: z.string().min(1), evidence: z.string().min(1) }),
);

export const parseAnnouncement = (json: unknown) => announcement.parse(json);
export const parseAliases = (json: unknown) => aliases.parse(json);
