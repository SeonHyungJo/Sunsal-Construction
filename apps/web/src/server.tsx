// Worker가 페이지 요청마다 부르는 서버 렌더링. 크롤러가 자바스크립트 없이도 본문을 읽게 한다.
// 클라이언트는 hydrate하지 않고 같은 화면을 다시 그린다 (main.tsx).
import { ORPCError } from "@orpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import { setServerFetch } from "./lib/orpc";
import { routeTree } from "./routeTree.gen";

export async function render(url: string, rpc: (req: Request) => Promise<Response>) {
  setServerFetch(rpc);
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [url] }),
  });
  await router.load();
  // HeadContent가 본문 맨 앞에 그리는 <title>은 빼고 head에 따로 넣는다 (Worker).
  const html = renderToString(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  ).replace(/^<title>.*?<\/title>/, "");
  const { matches } = router.state;
  // 루트만 맞으면 없는 경로, 입력 오류·NOT_FOUND(4xx)면 없는 단지·건설사
  const notFound =
    matches.length === 1 ||
    matches.some((m) => m.error instanceof ORPCError && m.error.status < 500);
  const meta = matches.flatMap((m) => m.meta ?? []).reverse(); // 하위 경로 값 우선
  return {
    html,
    status: notFound ? 404 : matches.some((m) => m.status === "error") ? 500 : 200,
    title: meta.find((m) => m?.title)?.title,
    description: meta.find((m) => m?.name === "description")?.content,
  };
}
