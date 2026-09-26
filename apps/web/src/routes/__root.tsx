import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Layout } from "../components/Layout";
import { PageHeader } from "../components/ui";
import { track } from "../lib/track";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [{ title: "순살시공 · 우리 아파트 시공사, 공식 하자 판정 순위에 있을까?" }],
  }),
  component: Root,
  errorComponent: () => (
    <PageHeader
      title="잠시 문제가 생겼습니다"
      lead="데이터를 불러오지 못했습니다. 잠시 후 새로고침해 주세요."
    />
  ),
  notFoundComponent: () => (
    <PageHeader title="페이지를 찾을 수 없습니다" lead="주소가 바뀌었거나 삭제된 페이지입니다." />
  ),
});

function Root() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    // 경로에는 단지코드만 있고 주소·검색어는 없다.
    track("page_view", { page_path: path });
    // 검색엔진용 canonical은 경로마다 (쿼리·UTM 제외). 정적 index.html에 두면 모든 페이지가 홈으로 묶인다.
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link)
      document.head.append(
        (link = Object.assign(document.createElement("link"), { rel: "canonical" })),
      );
    link.href = import.meta.env.VITE_SITE_URL + path;
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
