import { isDefinedError } from "@orpc/client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import { orpc } from "../lib/orpc";
import { track } from "../lib/track";

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * 주소 → 단지 선택 콤보박스 (WAI-ARIA combobox + listbox).
 * 검색어는 컴포넌트 상태에만 두고 URL·분석 이벤트에 싣지 않는다.
 */
export function SearchBox({
  location,
  autoFocus,
}: {
  location: "landing" | "search";
  autoFocus?: boolean;
}) {
  const id = useId();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
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

  function select(i: number) {
    const item = items[i];
    if (!item) return;
    track("complex_selected", { candidate_count: items.length });
    void navigate({ to: "/complex/$kaptCode", params: { kaptCode: item.kaptCode } });
  }

  let status = "";
  if (q.trim().length > 0 && q.trim().length < 2) status = "두 글자 이상 입력해 주세요.";
  else if (search.error)
    status =
      isDefinedError(search.error) && search.error.code === "RATE_LIMITED"
        ? "검색이 너무 잦습니다. 잠시 후 다시 시도해 주세요."
        : "검색 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";
  else if (debounced.length >= 2 && search.isFetching && items.length === 0) status = "찾는 중…";
  else if (debounced.length >= 2 && search.isSuccess && items.length === 0)
    status =
      "일치하는 단지를 찾지 못했습니다. 도로명(예: 테헤란로)이나 단지명으로 다시 검색해 보세요.";
  else if (items.length > 0)
    status = `후보 ${items.length}개. 위아래 화살표로 고르고 Enter로 선택하세요.`;

  const listId = `${id}-list`;
  const showList = open && items.length > 0;

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="mb-2 block font-semibold">
        아파트 주소 또는 단지명
      </label>
      <input
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${id}-opt-${active}` : undefined}
        aria-describedby={`${id}-status`}
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={autoFocus}
        placeholder="예: 광교중앙로 100, 래미안"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
          if (!started.current) {
            started.current = true;
            track("address_search_start", { location });
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            select(active >= 0 ? active : items.length === 1 ? 0 : -1);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-13 w-full rounded-none border-2 border-ink bg-paper px-4 text-lg placeholder:text-ink-3 focus-visible:outline-offset-0"
      />
      <p id={`${id}-status`} aria-live="polite" className="mt-2 min-h-5 text-sm text-ink-2">
        {status}
      </p>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="단지 후보"
          className="absolute inset-x-0 top-[calc(100%-1.5rem)] z-10 max-h-[60dvh] overflow-y-auto border-2 border-t-0 border-ink bg-paper shadow-lg"
        >
          {items.map((c, i) => (
            <li
              key={c.kaptCode}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(i)}
              onMouseEnter={() => setActive(i)}
              className="cursor-pointer border-b border-rule px-4 py-3 last:border-b-0 aria-selected:bg-accent-soft"
            >
              <span className="block font-semibold">{c.name}</span>
              <span className="block text-sm text-ink-2">
                {c.roadAddress ?? c.legalAddress ?? "주소 수집 전"}
              </span>
              {c.approvalDate && (
                <span className="block text-xs text-ink-3">
                  사용승인 {c.approvalDate.slice(0, 4)}년
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
