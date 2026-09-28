import { type ReactNode, useEffect, useId, useState } from "react";

export function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** 검색어 → 후보 선택 콤보박스 (WAI-ARIA combobox + listbox). 검색·상태 문구는 부르는 쪽이 정한다. */
export function Combobox<T>({
  label,
  placeholder,
  listLabel,
  autoFocus,
  value,
  onChange,
  items,
  status,
  itemKey,
  renderItem,
  onSelect,
}: {
  label: string;
  placeholder: string;
  listLabel: string;
  autoFocus?: boolean;
  value: string;
  onChange: (value: string) => void;
  items: T[];
  status: string;
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onSelect: (item: T) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  function select(i: number) {
    const item = items[i];
    if (item) onSelect(item);
  }

  const listId = `${id}-list`;
  const showList = open && items.length > 0;

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="mb-2 block font-semibold">
        {label}
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
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
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
          aria-label={listLabel}
          className="absolute inset-x-0 top-[calc(100%-1.5rem)] z-10 max-h-[60dvh] overflow-y-auto border-2 border-t-0 border-ink bg-paper shadow-lg"
        >
          {items.map((item, i) => (
            <li
              key={itemKey(item)}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(i)}
              onMouseEnter={() => setActive(i)}
              className="cursor-pointer border-b border-rule px-4 py-3 last:border-b-0 aria-selected:bg-accent-soft"
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
