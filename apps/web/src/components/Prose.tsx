import type { ReactNode } from "react";

/** 안내 문서용 본문 타이포그래피 */
export function Prose({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="max-w-2xl">
      <h1 className="text-display font-extrabold tracking-tight">{title}</h1>
      {lead && <p className="mt-3 text-lg text-ink-2">{lead}</p>}
      <div className="mt-8 flex flex-col gap-4 leading-relaxed [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-6 [&_h2]:border-b [&_h2]:border-ink [&_h2]:pb-2 [&_h2]:text-lg [&_h2]:font-extrabold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc">
        {children}
      </div>
    </article>
  );
}
