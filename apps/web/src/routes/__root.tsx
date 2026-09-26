import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Layout } from "../components/Layout";
import { track } from "../lib/track";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [{ title: "순살시공 · 우리 아파트 시공사, 공식 하자 판정 순위에 있을까?" }],
  }),
  component: Root,
  errorComponent: () => (
    <section>
      <h1 className="text-display font-extrabold">잠시 문제가 생겼습니다</h1>
      <p className="mt-3 text-ink-2">데이터를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>
    </section>
  ),
  notFoundComponent: () => (
    <section>
      <h1 className="text-display font-extrabold">페이지를 찾을 수 없습니다</h1>
      <p className="mt-3 text-ink-2">주소가 바뀌었거나 삭제된 페이지입니다.</p>
    </section>
  ),
});

function Root() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    // 경로에는 단지코드만 있고 주소·검색어는 없다.
    track("page_view", { page_path: path });
  }, [path]);

  return (
    <>
      <HeadContent />
      <Layout>
        <Outlet />
      </Layout>
    </>
  );
}
