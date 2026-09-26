interface Env {
  ASSETS: Fetcher;
  DB: D1Database; // K-apt 단지 (apps/api/migrations)
  STORE: KVNamespace; // 정정 요청·일간 리포트 기록
  SEARCH_LIMITER: RateLimit;
  CORRECTION_LIMITER: RateLimit;
  // 아래는 연결 전이면 비어 있다. 비어 있으면 해당 기능은 "미설정"으로 동작한다.
  DATA_GO_KR_KEY?: string; // 공공데이터포털 인증키 (Decoding) — 단지 동기화 cron
  ADMIN_TOKEN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  GA4_PROPERTY_ID?: string;
  ADSENSE_ACCOUNT_ID?: string; // pub-xxxxxxxxxxxxxxxx
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}
