import { useEffect } from "react";
import { ADSENSE_CLIENT, loadAdsense } from "../lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** 일반 광고 영역. 미설정이면 운영에서는 아무것도 그리지 않고, 개발 중에는 자리만 표시한다. */
export function AdSlot({ slot }: { slot: string | undefined }) {
  const enabled = Boolean(ADSENSE_CLIENT && slot);
  useEffect(() => {
    if (!enabled) return;
    loadAdsense();
    (window.adsbygoogle ??= []).push({});
  }, [enabled]);

  if (!enabled) {
    return import.meta.env.DEV ? (
      <div className="my-8 grid h-24 place-items-center border border-dashed border-rule text-xs text-ink-3">
        광고 영역 (미설정)
      </div>
    ) : null;
  }
  return (
    <aside aria-label="광고" className="my-8">
      <p className="mb-1 text-xs text-ink-3">광고</p>
      <ins
        className="adsbygoogle block"
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
