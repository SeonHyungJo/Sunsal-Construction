import type { Client } from "@sunsal/contract";
import { dot, month } from "../lib/format";
import { track } from "../lib/track";
import { ExternalLink } from "./ui";

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
      <ExternalLink href={a.sourceUrl} onClick={() => track("source_open", { location })}>
        원문 보기
      </ExternalLink>
    </p>
  );
}
