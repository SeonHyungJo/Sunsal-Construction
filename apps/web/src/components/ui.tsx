// 화면 공통 UI. 화면(routes)은 버튼·제목·안내 박스를 직접 스타일링하지 말고 여기 컴포넌트를 쓴다.
import { createLink, type LinkComponent } from "@tanstack/react-router";
import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  forwardRef,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn";

/* ── 버튼 ─────────────────────────────────────────────── */

type Variant = "primary" | "accent" | "outline" | "subtle";
const VARIANT: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-accent",
  accent: "bg-accent text-accent-ink hover:bg-ink",
  outline: "border-2 border-ink hover:bg-ink hover:text-paper",
  subtle: "border border-ink text-sm hover:bg-ink hover:text-paper",
};
const buttonClass = (variant: Variant) =>
  cn(
    "inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-colors disabled:opacity-60",
    variant === "subtle" ? "min-h-11 px-4" : "min-h-12 px-5",
    VARIANT[variant],
  );

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={cn(buttonClass(variant), className)} {...props} />;
}

const LinkAnchor = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }
>(({ variant = "outline", className, ...props }, ref) => (
  <a ref={ref} className={cn(buttonClass(variant), className)} {...props} />
));
/** 버튼 모양의 라우터 링크 */
export const ButtonLink: LinkComponent<typeof LinkAnchor> = createLink(LinkAnchor);

const TextAnchor = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
  ({ className, ...props }, ref) => (
    <a
      ref={ref}
      className={cn("underline decoration-rule underline-offset-4 hover:decoration-ink", className)}
      {...props}
    />
  ),
);
/** 본문 속 라우터 링크 */
export const TextLink: LinkComponent<typeof TextAnchor> = createLink(TextAnchor);

/** 외부 링크 (새 창) */
export function ExternalLink({
  href,
  children,
  className,
  onClick,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn("underline decoration-rule underline-offset-4 hover:decoration-ink", className)}
    >
      {children}
      <span className="sr-only"> (새 창)</span>
    </a>
  );
}

/* ── 제목 ─────────────────────────────────────────────── */

export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {eyebrow && <p className="text-sm text-ink-3">{eyebrow}</p>}
      <h1 className="text-display font-extrabold tracking-tight">{title}</h1>
      {lead && <p className="mt-2 text-ink-2">{lead}</p>}
      {children}
    </header>
  );
}

export function SectionTitle({
  id,
  children,
  action,
}: {
  id?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-ink pb-2">
      <h2 id={id} className="text-lg font-extrabold">
        {children}
      </h2>
      {action}
    </div>
  );
}

/* ── 안내 박스 ────────────────────────────────────────── */

type Tone = "accent" | "neutral" | "review" | "muted";
const TONE: Record<Tone, string> = {
  accent: "border-accent bg-accent-soft", // 상위 명단 포함
  neutral: "border-ink bg-paper-2", // 명단 밖 — 초록/파랑 등 '안전'으로 읽히는 색 금지
  review: "border-review bg-review-soft", // 확인 필요
  muted: "border-rule bg-paper-2", // 정보 없음·보조
};

export function Callout({
  tone,
  title,
  titleId,
  children,
}: {
  tone: Tone;
  title?: ReactNode;
  titleId?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={titleId} className={cn("border-l-4 p-5", TONE[tone])}>
      {title && (
        <h2 id={titleId} className="font-bold">
          {title}
        </h2>
      )}
      <div className={cn("text-sm leading-relaxed text-ink-2", title && "mt-3")}>{children}</div>
    </section>
  );
}

/** 페이지 안의 짧은 주석·설명 */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("bg-paper-2 p-4 text-sm leading-relaxed text-ink-2", className)}>{children}</p>
  );
}

/* ── 상태 ─────────────────────────────────────────────── */

export function Loading({ children = "불러오는 중…" }: { children?: ReactNode }) {
  return <p className="py-8 text-ink-3">{children}</p>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="py-8 text-ink-2">{children}</p>;
}

/* ── 탭 (구간 전환) ───────────────────────────────────── */

export function SegmentedTabs<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex border-2 border-ink">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className="min-h-11 px-4 text-sm font-semibold whitespace-nowrap aria-selected:bg-ink aria-selected:text-paper"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── 폼 ───────────────────────────────────────────────── */

export const inputClass = "w-full border-2 border-ink bg-paper px-3 placeholder:text-ink-3";

export function Field({
  id,
  label,
  optional,
  hint,
  children,
}: {
  id: string;
  label: string;
  optional?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-semibold">
        {label} {optional && <span className="font-normal text-ink-3">({optional})</span>}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
}
