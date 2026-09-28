import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const nav = [
  { to: "/ranking", label: "전체 순위" },
  { to: "/search", label: "주소 검색" },
  { to: "/builders", label: "건설사 검색" },
  { to: "/methodology", label: "기준·출처" },
] as const;

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:bg-paper focus:p-2"
      >
        본문 바로가기
      </a>
      <header className="border-b-2 border-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-3">
          <Link to="/" className="text-xl font-extrabold tracking-tight">
            순살시공
          </Link>
          <nav aria-label="주요 메뉴">
            <ul className="flex gap-1 text-sm">
              {nav.map((n) => (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    className="inline-flex min-h-11 items-center px-2 whitespace-nowrap text-ink-2 hover:text-ink [&.active]:font-semibold [&.active]:text-ink"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:py-10">
        {children}
      </main>
      <footer className="border-t border-rule bg-paper-2 text-sm text-ink-2">
        <div className="mx-auto grid max-w-5xl gap-4 px-4 py-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <p className="max-w-prose leading-relaxed">
            순살시공은 국토교통부가 공개한 공동주택 하자 판정 상위 건설사 명단과 공동주택
            기본정보(K-apt)를 연결해 보여줍니다. 순위는 회사 전체의 기간별 판정 건수이며, 개별
            단지의 하자 여부나 안전성을 판정하지 않습니다.
          </p>
          <ul className="flex flex-col gap-1">
            <li>
              <Link to="/methodology" className="inline-flex min-h-8 items-center hover:text-ink">
                순위 기준·출처
              </Link>
            </li>
            <li>
              <Link to="/corrections" className="inline-flex min-h-8 items-center hover:text-ink">
                정정 요청·처리 이력
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="inline-flex min-h-8 items-center hover:text-ink">
                개인정보처리방침·광고 안내
              </Link>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
