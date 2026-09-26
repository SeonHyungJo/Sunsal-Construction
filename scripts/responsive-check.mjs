// 주요 화면을 여러 너비로 렌더링해 가로 넘침을 검사하고 스크린샷을 남긴다 (SSC-17).
// 사용: pnpm dev 실행 후 node scripts/responsive-check.mjs [baseUrl] [outDir]
// 로컬 Chrome을 CDP로 띄운다. 추가 의존성 없음 (Node 22+ WebSocket).
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";

const base = process.argv[2] ?? "http://localhost:5173";
const out = process.argv[3] ?? "responsive-shots";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const widths = [320, 390, 768, 1440];
const pages = [
  "/",
  "/ranking",
  "/ranking?period=half&id=2024-h1",
  "/search",
  "/complex/A90000001",
  "/complex/A90000004",
  "/complex/A90000006",
  "/complex/A90000008",
  "/methodology",
  "/corrections",
  "/privacy",
  "/checklist",
];

mkdirSync(out, { recursive: true });
const port = 9333;
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${port}`,
    "--user-data-dir=/tmp/sunsal-cdp",
    "about:blank",
  ],
  { stdio: "ignore" },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let wsUrl;
for (let i = 0; i < 50 && !wsUrl; i++) {
  await sleep(200);
  wsUrl = await fetch(`http://127.0.0.1:${port}/json/list`)
    .then((r) => r.json())
    .then((t) => t.find((x) => x.type === "page")?.webSocketDebuggerUrl)
    .catch(() => undefined);
}
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  pending.get(m.id)?.(m);
});
const send = (method, params = {}) =>
  new Promise((res) => {
    pending.set(++id, res);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) =>
  (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result
    .result.value;

let failures = 0;
for (const w of widths) {
  await send("Emulation.setDeviceMetricsOverride", {
    width: w,
    height: 900,
    deviceScaleFactor: 1,
    mobile: w < 768,
  });
  for (const p of pages) {
    await send("Page.navigate", { url: base + p });
    await sleep(1500);
    const r = await evaluate(`(() => {
      const vw = document.documentElement.clientWidth;
      const over = [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > vw + 1 && getComputedStyle(el).position !== "fixed").slice(0, 3).map((el) => el.tagName + "." + [...el.classList].slice(0, 3).join("."));
      return { sw: document.documentElement.scrollWidth, vw, over, h: document.documentElement.scrollHeight };
    })()`);
    const ok = r.over.length === 0 && r.sw <= r.vw;
    if (!ok) failures++;
    console.log(
      `${ok ? "ok  " : "FAIL"} ${w}px ${p}${ok ? "" : ` scrollWidth=${r.sw} vw=${r.vw} ${r.over.join(", ")}`}`,
    );
    await send("Emulation.setDeviceMetricsOverride", {
      width: w,
      height: Math.min(r.h, 4000),
      deviceScaleFactor: 1,
      mobile: w < 768,
    });
    const shot = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(
      `${out}/${w}${p.replaceAll("/", "_") || "_"}.png`,
      Buffer.from(shot.result.data, "base64"),
    );
    await send("Emulation.setDeviceMetricsOverride", {
      width: w,
      height: 900,
      deviceScaleFactor: 1,
      mobile: w < 768,
    });
  }
}
ws.close();
chrome.kill();
console.log(failures ? `\n${failures} overflow issue(s)` : "\nno horizontal overflow");
process.exit(failures ? 1 : 0);
