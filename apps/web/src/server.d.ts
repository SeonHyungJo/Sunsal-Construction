// apps/api(Worker)가 타입만 보는 선언. 구현은 server.tsx (DOM·JSX 설정이 다른 tsconfig에서 따라 읽지 않게).
export function render(
  url: string,
  rpc: (req: Request) => Promise<Response>,
): Promise<{ html: string; status: number; title?: string; description?: string }>;
