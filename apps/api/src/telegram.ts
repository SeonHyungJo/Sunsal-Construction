export async function sendTelegram(
  env: Pick<Env, "TELEGRAM_BOT_TOKEN" | "TELEGRAM_CHAT_ID">,
  text: string,
) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID)
    return { ok: false as const, error: "미설정" };
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10_000),
  });
  // 응답 본문에 토큰이 섞이지 않지만 URL에는 있으므로 오류 메시지에 URL을 넣지 않는다.
  return res.ok ? { ok: true as const } : { ok: false as const, error: `HTTP ${res.status}` };
}
