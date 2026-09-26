// Cloudflare KV에 두는 작은 상태: 정정 요청, 일간 리포트 발송 기록.
import type { correctionKinds, correctionStatuses } from "@sunsal/contract";

export type CorrectionPublic = {
  id: string;
  kind: (typeof correctionKinds)[number];
  kaptCode: string | null;
  status: (typeof correctionStatuses)[number];
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
};

const YEAR = 365 * 24 * 60 * 60;

/**
 * pub:{id}  공개 정보 (값 + list용 metadata, 영구)
 * priv:{id} 요청 본문·연락처 (처리 완료 후 1년 TTL로 자동 삭제 — 개인정보처리방침)
 */
export const corrections = {
  async create(
    kv: KVNamespace,
    input: { kind: CorrectionPublic["kind"]; kaptCode?: string; message: string; contact?: string },
  ) {
    const now = new Date().toISOString();
    const pub: CorrectionPublic = {
      id: crypto.randomUUID(),
      kind: input.kind,
      kaptCode: input.kaptCode ?? null,
      status: "received",
      resolution: null,
      createdAt: now,
      updatedAt: now,
    };
    await kv.put(
      `priv:${pub.id}`,
      JSON.stringify({ message: input.message, contact: input.contact || null }),
    );
    await kv.put(`pub:${pub.id}`, JSON.stringify(pub), { metadata: pub });
    return pub;
  },

  get: (kv: KVNamespace, id: string) => kv.get<CorrectionPublic>(`pub:${id}`, "json"),

  async review(
    kv: KVNamespace,
    id: string,
    status: CorrectionPublic["status"],
    resolution: string | undefined,
  ) {
    const prev = await corrections.get(kv, id);
    if (!prev) return null;
    const pub: CorrectionPublic = {
      ...prev,
      status,
      resolution: resolution ?? null,
      updatedAt: new Date().toISOString(),
    };
    await kv.put(`pub:${id}`, JSON.stringify(pub), { metadata: pub });
    if (status === "applied" || status === "rejected") {
      const priv = await kv.get(`priv:${id}`);
      if (priv) await kv.put(`priv:${id}`, priv, { expirationTtl: YEAR });
    }
    return pub;
  },

  /** 처리 완료(반영·반려) 최신 50건 */
  async log(kv: KVNamespace) {
    const done: CorrectionPublic[] = [];
    let cursor: string | undefined;
    do {
      const page = await kv.list<CorrectionPublic>({ prefix: "pub:", cursor });
      for (const k of page.keys)
        if (k.metadata && (k.metadata.status === "applied" || k.metadata.status === "rejected"))
          done.push(k.metadata);
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    return done.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 50);
  },
};

export type DailyReport = {
  status: "sent" | "failed" | "not_configured";
  message: string;
  attempts: number;
};

export const dailyReports = {
  get: (kv: KVNamespace, date: string) => kv.get<DailyReport>(`report:${date}`, "json"),
  put: (kv: KVNamespace, date: string, r: DailyReport) =>
    kv.put(`report:${date}`, JSON.stringify(r), { expirationTtl: 90 * 24 * 60 * 60 }),
};
