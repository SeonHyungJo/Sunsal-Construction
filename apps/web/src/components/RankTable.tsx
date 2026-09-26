import type { Client } from "@sunsal/contract";
import { num } from "../lib/format";

type Company = NonNullable<Awaited<ReturnType<Client["ranking"]["latest"]>>>["companies"][number];

/** 모바일은 2열 목록, md 이상은 표. 같은 DOM(table)이라 스크린리더에는 항상 표로 읽힌다. */
export function RankTable({ companies, caption }: { companies: Company[]; caption: string }) {
  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">{caption}</caption>
      <thead className="hidden text-xs text-ink-3 md:table-header-group">
        <tr className="border-b border-ink">
          <th scope="col" className="py-2 pr-3 font-medium">
            순위
          </th>
          <th scope="col" className="py-2 pr-3 font-medium">
            건설사 (발표 원문 표기)
          </th>
          <th scope="col" className="py-2 pr-3 text-right font-medium">
            하자 판정 건수
            <span className="block font-normal">세부 하자수</span>
          </th>
          <th scope="col" className="py-2 text-right font-medium">
            판정 사건수
          </th>
        </tr>
      </thead>
      <tbody>
        {companies.map((c) => (
          <tr
            key={c.companyName}
            className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-rule py-3 md:table-row"
          >
            <td className="tnum text-2xl font-extrabold text-accent md:py-3 md:pr-3 md:text-xl">
              {c.rank}
              <span className="sr-only">위</span>
            </td>
            <th scope="row" className="font-semibold md:py-3 md:pr-3">
              {c.companyName}
              {c.note && <span className="block text-xs font-normal text-ink-3">{c.note}</span>}
            </th>
            <td className="tnum text-right md:py-3 md:pr-3">
              <span className="text-lg font-bold">{num(c.companyDefectCount)}</span>
              <span className="text-sm text-ink-3">건</span>
            </td>
            <td className="tnum col-start-2 col-end-4 text-sm text-ink-3 md:py-3 md:text-right md:text-base md:text-ink-2">
              <span className="md:hidden">판정 사건 </span>
              {num(c.companyCaseCount)}건
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
