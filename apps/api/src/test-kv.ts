/// <reference types="@cloudflare/workers-types" />
// 테스트용 메모리 KV (get/put/list + metadata). TTL은 기록만 한다.
export function fakeKv() {
  const data = new Map<string, { value: string; metadata?: unknown; ttl?: number }>();
  const kv = {
    data,
    async get(key: string, type?: "json") {
      const v = data.get(key)?.value;
      return v == null ? null : type === "json" ? JSON.parse(v) : v;
    },
    async put(key: string, value: string, opts?: { metadata?: unknown; expirationTtl?: number }) {
      data.set(key, { value, metadata: opts?.metadata, ttl: opts?.expirationTtl });
    },
    async list({ prefix = "" }: { prefix?: string } = {}) {
      const keys = [...data]
        .filter(([k]) => k.startsWith(prefix))
        .map(([name, v]) => ({ name, metadata: v.metadata }));
      return { keys, list_complete: true, cursor: "" };
    },
  };
  return kv as unknown as KVNamespace & { data: typeof data };
}
