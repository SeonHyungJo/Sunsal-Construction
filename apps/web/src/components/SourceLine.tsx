import type { Client } from "@sunsal/contract";
import { dot, month } from "../lib/format";
import { track } from "../lib/track";

type Announcement = NonNullable<Awaited<ReturnType<Client["ranking"]["latest"]>>>["announcement"];

export function SourceLine({
  announcement: a,
  location,
}: {
  announcement: Announcement;
  location: "landing" | "ranking" | "result" | "methodology";
}) {
  return (
    <p className="text-sm text-ink-3">
      집계 기간 {month(a.periodStart)}~{month(a.periodEnd)} · 발표 {dot(a.publishedOn)} · 국토교통부{" "}
      <a
        href={a.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("source_open", { location })}
        className="underline decoration-rule underline-offset-4 hover:text-ink hover:decoration-ink"
      >
        원문 보기
        <span className="sr-only"> (새 창)</span>
      </a>
    </p>
  );
}
