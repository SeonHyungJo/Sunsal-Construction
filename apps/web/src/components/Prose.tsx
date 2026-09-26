import type { ReactNode } from "react";
import { PageHeader } from "./ui";

/** 안내 문서용 본문 타이포그래피. 스타일은 바로 아래 요소에만 적용해 안에 넣은 컴포넌트(Callout 등)를 건드리지 않는다. */
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
      <PageHeader title={title} lead={lead} />
      <div className="flex flex-col gap-4 leading-relaxed [&>h2]:mt-6 [&>h2]:border-b [&>h2]:border-ink [&>h2]:pb-2 [&>h2]:text-lg [&>h2]:font-extrabold [&>ol]:list-decimal [&>ol>li]:ml-5 [&>p_a]:underline [&>p_a]:underline-offset-4 [&>ul]:list-disc [&>ul>li]:ml-5 [&>ul_a]:underline [&>ol_a]:underline">
        {children}
      </div>
    </article>
  );
}
