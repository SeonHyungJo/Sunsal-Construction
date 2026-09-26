interface Env {
  ASSETS: Fetcher;
  STORE: KVNamespace; // 정정 요청·일간 리포트 기록
  SEARCH_LIMITER: RateLimit;
  CORRECTION_LIMITER: RateLimit;
  DATA_MODE?: "sample"; // 로컬 개발만. 운영은 비워 두어 실제 K-apt 데이터를 쓴다.
  // 아래는 연결 전이면 비어 있다. 비어 있으면 해당 기능은 "미설정"으로 동작한다.
  ADMIN_TOKEN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  GA4_PROPERTY_ID?: string;
  ADSENSE_ACCOUNT_ID?: string; // pub-xxxxxxxxxxxxxxxx
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}
