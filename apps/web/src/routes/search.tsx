import { createFileRoute } from "@tanstack/react-router";
import { SearchBox } from "../components/SearchBox";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "주소로 우리 아파트 시공사 찾기 · 순살시공" }] }),
  component: Search,
});

function Search() {
  return (
    <article className="max-w-2xl">
      <h1 className="text-display font-extrabold tracking-tight">우리 아파트 시공사 찾기</h1>
      <p className="mt-2 text-ink-2">
        도로명주소나 단지명을 입력하고 목록에서 단지를 고르세요. 동·호수는 입력하지 않아도 됩니다.
      </p>
      <div className="mt-6 pb-72">
        <SearchBox location="search" autoFocus />
      </div>
    </article>
  );
}
