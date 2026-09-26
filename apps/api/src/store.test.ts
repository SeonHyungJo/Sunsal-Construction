import { expect, test } from "vitest";
import { corrections } from "./store.ts";
import { fakeKv } from "./test-kv.ts";

test("정정 요청: 접수 → 반영 → 공개 이력, 본문은 1년 TTL", async () => {
  const kv = fakeKv();
  const c = await corrections.create(kv, {
    kind: "builder_match",
    kaptCode: "A90000007",
    message: "대우는 대우건설이 아닙니다",
    contact: "a@b.c",
  });
  expect(await corrections.get(kv, c.id)).toMatchObject({ status: "received", resolution: null });
  expect(await corrections.log(kv)).toEqual([]);

  const done = await corrections.review(kv, c.id, "applied", "명단 밖으로 정정");
  expect(done).toMatchObject({ status: "applied", resolution: "명단 밖으로 정정" });
  expect((await corrections.log(kv)).map((r) => r.id)).toEqual([c.id]);

  // 공개 정보에는 본문·연락처가 없다
  expect(JSON.stringify(await corrections.get(kv, c.id))).not.toContain("a@b.c");
  expect(kv.data.get(`priv:${c.id}`)?.ttl).toBe(365 * 24 * 60 * 60);
});

test("없는 요청 검토는 null", async () => {
  expect(
    await corrections.review(
      fakeKv(),
      "00000000-0000-0000-0000-000000000000",
      "applied",
      undefined,
    ),
  ).toBeNull();
});
