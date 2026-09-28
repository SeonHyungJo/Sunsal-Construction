import { useEffect } from "react";
import { ADSENSE_CLIENT, loadAdsense } from "../lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const SLOTS = {
  landing: import.meta.env.VITE_ADSENSE_SLOT_LANDING,
  result: import.meta.env.VITE_ADSENSE_SLOT_RESULT,
  builder: import.meta.env.VITE_ADSENSE_SLOT_BUILDER,
};

/** 일반 광고 영역. 미설정이면 운영에서는 아무것도 그리지 않고, 개발 중에는 점선으로 자리만 표시한다. */
export function AdSlot({ name }: { name: keyof typeof SLOTS }) {
  const slot = SLOTS[name];
  const enabled = Boolean(ADSENSE_CLIENT && slot);
  useEffect(() => {
    if (!enabled) return;
    loadAdsense();
    (window.adsbygoogle ??= []).push({});
  }, [enabled]);

  if (!enabled) {
    // 반응형 디스플레이 광고 모바일 기본 크기(300×250 전후)에 맞춘 자리
    return import.meta.env.DEV ? (
      <div className="my-8 grid h-[250px] place-items-center border-2 border-dashed border-rule text-xs text-ink-3">
        광고 영역 · VITE_ADSENSE_SLOT_{name.toUpperCase()} (미설정)
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
