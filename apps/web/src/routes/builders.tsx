import { createFileRoute } from "@tanstack/react-router";
import { BuilderSearchBox } from "../components/SearchBox";
import { PageHeader, TextLink } from "../components/ui";

export const Route = createFileRoute("/builders")({
  head: () => ({ meta: [{ title: "건설사 검색 · 시공 아파트와 하자 판정 순위 · 순살시공" }] }),
  component: Builders,
});

function Builders() {
  return (
    <article className="max-w-2xl">
      <PageHeader
        title="건설사 검색"
        lead="건설사를 고르면 그 회사가 시공한 아파트를 최신순으로, 공개된 하자 판정 순위와 함께 보여드립니다."
      />
      <div className="pb-72">
        <BuilderSearchBox autoFocus />
        <p className="mt-4 text-sm text-ink-3">
          상위 20개사는 <TextLink to="/ranking">전체 순위</TextLink>에서 회사 이름을 눌러도 됩니다.
        </p>
      </div>
    </article>
  );
}
