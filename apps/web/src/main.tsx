import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import { loadAdsense } from "./lib/ads";
import { loadGtm } from "./lib/track";
import "./index.css";

const queryClient = new QueryClient();
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: true,
});

loadGtm(import.meta.env.VITE_GTM_ID);
loadAdsense(); // 사이트 심사·자동 광고·Offerwall용. 미설정이면 아무것도 하지 않는다.

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// 서버가 그린 본문(server.tsx)을 데이터·화면 코드가 준비된 뒤에 한 번에 바꿔 깜빡임을 줄인다.
await router.load();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
