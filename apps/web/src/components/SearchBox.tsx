import { ORPCError } from "@orpc/client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { orpc } from "../lib/orpc";
import { track } from "../lib/track";
import { Combobox, useDebounced } from "./Combobox";

const searchError = (error: unknown) =>
  error instanceof ORPCError && error.code === "RATE_LIMITED"
    ? "검색이 너무 잦습니다. 잠시 후 다시 시도해 주세요."
    : "검색 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";

/**
 * 주소 → 단지 선택.
 * 검색어는 컴포넌트 상태에만 두고 URL·분석 이벤트에 싣지 않는다.
 */
export function SearchBox({
  location,
  autoFocus,
}: {
  location: "landing" | "search";
  autoFocus?: boolean;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const started = useRef(false);
  const debounced = useDebounced(q.trim(), 250);

  const search = useQuery({
    ...orpc.complex.search.queryOptions({ input: { q: debounced } }),
    enabled: debounced.length >= 2,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 60_000,
  });
  const items = debounced.length >= 2 && search.data?.status === "ok" ? search.data.items : [];

  let status = "";
  if (q.trim().length > 0 && q.trim().length < 2) status = "두 글자 이상 입력해 주세요.";
  else if (search.error) status = searchError(search.error);
  else if (search.data?.status === "not_ready")
    status = "단지 데이터를 준비하고 있습니다. 공식 순위는 지금 바로 확인할 수 있습니다.";
  else if (debounced.length >= 2 && search.isFetching && items.length === 0) status = "찾는 중…";
  else if (debounced.length >= 2 && search.isSuccess && items.length === 0)
    status =
      "일치하는 단지를 찾지 못했습니다. 도로명(예: 테헤란로)이나 단지명으로 다시 검색해 보세요.";
  else if (items.length > 0)
    status = `후보 ${items.length}개. 위아래 화살표로 고르고 Enter로 선택하세요.`;

  return (
    <Combobox
      label="아파트 주소 또는 단지명"
      placeholder="예: 광교중앙로 100, 래미안"
      listLabel="단지 후보"
      autoFocus={autoFocus}
      value={q}
      onChange={(v) => {
        setQ(v);
        if (!started.current) {
          started.current = true;
          track("address_search_start", { location });
        }
      }}
      items={items}
      status={status}
      itemKey={(c) => c.kaptCode}
      onSelect={(c) => {
        track("complex_selected", { candidate_count: items.length });
        void navigate({ to: "/complex/$kaptCode", params: { kaptCode: c.kaptCode } });
      }}
      renderItem={(c) => (
        <>
          <span className="block font-semibold">{c.name}</span>
          <span className="block text-sm text-ink-2">
            {c.roadAddress ?? c.legalAddress ?? "주소 수집 전"}
          </span>
          {c.approvalDate && (
            <span className="block text-xs text-ink-3">
              사용승인 {c.approvalDate.slice(0, 4)}년
            </span>
          )}
        </>
      )}
    />
  );
}

/** 건설사 이름 → 건설사 페이지 */
export function BuilderSearchBox({ autoFocus }: { autoFocus?: boolean }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const debounced = useDebounced(q.trim(), 250);

  const search = useQuery({
    ...orpc.builder.search.queryOptions({ input: { q: debounced } }),
    enabled: debounced.length >= 2,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 60_000,
  });
  const items = debounced.length >= 2 ? (search.data ?? []) : [];

  let status = "";
  if (q.trim().length > 0 && q.trim().length < 2) status = "두 글자 이상 입력해 주세요.";
  else if (search.error) status = searchError(search.error);
  else if (debounced.length >= 2 && search.isFetching && items.length === 0) status = "찾는 중…";
  else if (debounced.length >= 2 && search.isSuccess && items.length === 0)
    status = "일치하는 건설사를 찾지 못했습니다. 회사 이름 일부(예: 현대, 자이)로 검색해 보세요.";
  else if (items.length > 0)
    status = `후보 ${items.length}개. 위아래 화살표로 고르고 Enter로 선택하세요.`;

  return (
    <Combobox
      label="건설사 이름"
      placeholder="예: 대우건설, 호반"
      listLabel="건설사 후보"
      autoFocus={autoFocus}
      value={q}
      onChange={setQ}
      items={items}
      status={status}
      itemKey={(b) => b.key}
      onSelect={(b) => void navigate({ to: "/builder/$key", params: { key: b.key } })}
      renderItem={(b) => (
        <>
          <span className="block font-semibold">{b.name}</span>
          <span className="block text-sm text-ink-2">
            시공 단지 {b.complexCount.toLocaleString("ko-KR")}곳
            {b.rank !== null && ` · 최근 6개월 하자 판정 ${b.rank}위`}
          </span>
        </>
      )}
    />
  );
}
