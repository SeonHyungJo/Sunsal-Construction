import { isDefinedError } from "@orpc/client";
import { correctionKinds } from "@sunsal/contract/constants";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Prose } from "../components/Prose";
import { dateTime } from "../lib/format";
import { orpc } from "../lib/orpc";
import { track } from "../lib/track";

type Kind = (typeof correctionKinds)[number];
const KIND_LABEL: Record<Kind, string> = {
  builder_match: "시공사 매칭 오류",
  ranking: "순위·건수 오류",
  complex: "단지 정보 오류",
  other: "기타",
};
const STATUS_LABEL = {
  received: "접수",
  reviewing: "검토 중",
  applied: "반영",
  rejected: "반려",
} as const;

export const Route = createFileRoute("/corrections")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { kaptCode?: string; kind?: Kind; id?: string } => ({
    kaptCode:
      typeof s.kaptCode === "string" && /^[A-Z0-9]{6,12}$/.test(s.kaptCode)
        ? s.kaptCode
        : undefined,
    kind: correctionKinds.includes(s.kind as Kind) ? (s.kind as Kind) : undefined,
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  head: () => ({ meta: [{ title: "정정 요청·처리 이력 · 순살시공" }] }),
  component: Corrections,
});

function Corrections() {
  const search = Route.useSearch();
  return (
    <Prose
      title="정정 요청"
      lead="시공사 매칭, 순위, 단지 정보가 틀렸다면 알려주세요. 검토 후 반영하거나 사유를 안내합니다."
    >
      {search.id ? (
        <Status id={search.id} />
      ) : (
        <Form kaptCode={search.kaptCode} kind={search.kind} />
      )}
      <Log />
    </Prose>
  );
}

function Form({ kaptCode, kind: initialKind }: { kaptCode?: string; kind?: Kind }) {
  const navigate = Route.useNavigate();
  const [kind, setKind] = useState<Kind>(initialKind ?? "builder_match");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const submit = useMutation(
    orpc.correction.create.mutationOptions({
      onSuccess: ({ id }) => {
        track("correction_submit", { kind });
        void navigate({ search: { id } });
      },
    }),
  );

  const error = submit.error
    ? isDefinedError(submit.error) && submit.error.code === "RATE_LIMITED"
      ? "요청이 너무 잦습니다. 1분 뒤 다시 보내 주세요."
      : "보내지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요."
    : null;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit.mutate({ kind, kaptCode, message, contact: contact || undefined });
      }}
    >
      <fieldset>
        <legend className="mb-2 font-semibold">무엇이 틀렸나요?</legend>
        <div className="grid grid-cols-2 gap-2">
          {correctionKinds.map((k) => (
            <label
              key={k}
              className="flex min-h-11 cursor-pointer items-center gap-2 border border-rule px-3 has-checked:border-ink has-checked:bg-paper-2"
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="accent-ink"
              />
              {KIND_LABEL[k]}
            </label>
          ))}
        </div>
      </fieldset>
      {kaptCode && (
        <p className="text-sm text-ink-2">
          대상 단지 코드: <span className="tnum font-semibold">{kaptCode}</span>
        </p>
      )}
      <div>
        <label htmlFor="message" className="mb-2 block font-semibold">
          내용 <span className="font-normal text-ink-3">(10자 이상)</span>
        </label>
        <textarea
          id="message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-describedby="message-hint"
          className="w-full border-2 border-ink bg-paper p-3"
        />
        <p id="message-hint" className="mt-1 text-sm text-ink-3">
          근거(공식 자료 링크 등)를 함께 적어 주시면 빨리 확인할 수 있습니다. 동·호수, 전화번호 같은
          개인정보는 적지 마세요.
        </p>
      </div>
      <div>
        <label htmlFor="contact" className="mb-2 block font-semibold">
          답변 받을 이메일 <span className="font-normal text-ink-3">(선택)</span>
        </label>
        <input
          id="contact"
          type="email"
          maxLength={200}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="h-12 w-full border-2 border-ink bg-paper px-3"
        />
        <p className="mt-1 text-sm text-ink-3">
          처리 결과 안내에만 쓰고, 처리 완료 1년 뒤 삭제합니다.{" "}
          <Link to="/privacy">개인정보처리방침</Link>
        </p>
      </div>
      {error && (
        <p role="alert" className="text-accent">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submit.isPending}
        className="inline-flex min-h-12 items-center justify-center self-start bg-ink px-6 font-semibold whitespace-nowrap text-paper hover:bg-accent disabled:opacity-60"
      >
        {submit.isPending ? "보내는 중…" : "정정 요청 보내기"}
      </button>
    </form>
  );
}

function Status({ id }: { id: string }) {
  const { data, isPending, isError } = useQuery(
    orpc.correction.get.queryOptions({ input: { id } }),
  );
  return (
    <section aria-labelledby="status" className="border-l-4 border-ink bg-paper-2 p-5">
      <h2 id="status" className="!mt-0 !border-0 !pb-0">
        정정 요청 처리 상태
      </h2>
      {isPending && <p className="text-ink-3">불러오는 중…</p>}
      {isError && <p>접수 번호를 찾을 수 없습니다.</p>}
      {data && (
        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
          <dt className="text-ink-3">접수 번호</dt>
          <dd className="tnum break-all">{data.id}</dd>
          <dt className="text-ink-3">유형</dt>
          <dd>{KIND_LABEL[data.kind]}</dd>
          <dt className="text-ink-3">상태</dt>
          <dd className="font-semibold">{STATUS_LABEL[data.status]}</dd>
          {data.resolution && (
            <>
              <dt className="text-ink-3">처리 내용</dt>
              <dd>{data.resolution}</dd>
            </>
          )}
          <dt className="text-ink-3">접수일</dt>
          <dd>{dateTime(data.createdAt)}</dd>
        </dl>
      )}
      <p className="mt-3 text-sm text-ink-2">
        이 페이지 주소를 저장해 두면 나중에 처리 상태를 다시 확인할 수 있습니다.
      </p>
    </section>
  );
}

function Log() {
  const { data } = useQuery(orpc.correction.log.queryOptions());
  return (
    <>
      <h2>처리 이력</h2>
      {!data?.length ? (
        <p className="text-ink-3">아직 처리된 정정 요청이 없습니다.</p>
      ) : (
        <ul className="!ml-0 flex list-none flex-col">
          {data.map((r) => (
            <li key={r.id} className="!ml-0 border-b border-rule py-3 text-sm">
              <span className="font-semibold">{STATUS_LABEL[r.status]}</span> · {KIND_LABEL[r.kind]}
              {r.kaptCode && <span className="tnum text-ink-3"> · {r.kaptCode}</span>}
              <span className="text-ink-3"> · {dateTime(r.updatedAt)}</span>
              {r.resolution && <p className="mt-1 text-ink-2">{r.resolution}</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
