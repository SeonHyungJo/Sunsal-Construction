// GTM dataLayer 이벤트. 주소·검색어·동호수·연락처는 절대 넣지 않는다 — 파라미터는 아래 타입의 열거값·숫자만 허용한다.
type Events = {
  page_view: { page_path: string };
  address_search_start: { location: "landing" | "search" };
  complex_selected: { candidate_count: number };
  result_view: { match_status: "listed" | "not_listed" | "needs_review" | "unknown" };
  builder_match_failed: { reason: "multiple_builders" | "similar_name" | "unknown" };
  ranking_expand: Record<string, never>;
  source_open: { location: "landing" | "ranking" | "result" | "methodology" };
  correction_submit: { kind: string };
  share: { method: "native" | "copy" };
};

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function track<E extends keyof Events>(
  event: E,
  ...[params]: Events[E] extends Record<string, never> ? [] : [Events[E]]
) {
  (window.dataLayer ??= []).push({ event, ...params });
}

export function loadGtm(id: string | undefined) {
  if (!id) return;
  window.dataLayer ??= [];
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.append(s);
}
