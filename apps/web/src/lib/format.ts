/** "2026-03-30" → "2026.03.30" */
export const dot = (d: string) => d.replaceAll("-", ".");
/** "2025-09-01" → "2025.09" */
export const month = (d: string) => d.slice(0, 7).replace("-", ".");
export const num = (n: number) => n.toLocaleString("ko-KR");
export const dateTime = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" }).format(
    new Date(iso),
  );
