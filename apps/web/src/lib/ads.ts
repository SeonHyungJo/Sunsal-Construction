// AdSense. 승인 전·미설정이면 아무것도 로드하지 않는다.
// Offerwall은 AdSense 콘솔(개인정보 보호 및 메시지 → Offerwall)에서 결과 경로(/complex/*)에 설정한다.
// 보상형 광고 재고가 없거나 차단돼도 결과 화면은 그대로 보인다 — 앱 코드에서 결과를 가리지 않는다.
export const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined; // ca-pub-…

let loaded = false;
export function loadAdsense() {
  if (!ADSENSE_CLIENT || loaded) return;
  loaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
  document.head.append(s);
}
