// 일간 리포트용 Google OAuth 갱신 토큰 발급 (partner@duruit.com으로 로그인해 승인).
// 사용: node scripts/google-oauth.mjs <client.json> <out-token-file>
//   client.json = {"client_id":"…","client_secret":"…"} (Google Cloud 데스크톱 앱 클라이언트)
// 출력된 URL을 브라우저에서 열고 승인하면 갱신 토큰을 out 파일(권한 600)에만 저장한다. 토큰은 화면에 찍지 않는다.
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";

const [clientFile, outFile] = process.argv.slice(2);
if (!clientFile || !outFile)
  throw new Error("사용: node scripts/google-oauth.mjs <client.json> <out-token-file>");
const { client_id, client_secret } = JSON.parse(readFileSync(clientFile, "utf8"));
const SCOPES = [
  "https://www.googleapis.com/auth/adsense.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
];

const server = createServer(async (req, res) => {
  res.setHeader("content-type", "text/plain; charset=utf-8");
  const url = new URL(req.url, "http://127.0.0.1");
  const code = url.searchParams.get("code");
  if (!code) return res.end(url.searchParams.get("error") ?? "no code");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      code,
      client_id,
      client_secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const t = await r.json();
  if (!t.refresh_token) {
    res.end("refresh_token 없음 — 콘솔 로그 확인");
    console.error("토큰 교환 실패:", t.error, t.error_description);
  } else {
    writeFileSync(outFile, t.refresh_token, { mode: 0o600 });
    res.end("완료. 이 창을 닫아도 됩니다.");
    console.log(`갱신 토큰 저장: ${outFile} (scope: ${t.scope})`);
  }
  server.close();
});

let redirectUri = "";
server.listen(0, "127.0.0.1", () => {
  redirectUri = `http://127.0.0.1:${server.address().port}`;
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    login_hint: "partner@duruit.com",
  }).toString();
  console.log(`AUTH_URL ${auth}`);
});
