const LEGAL_FORM = /\(주\)|㈜|\(유\)|㈲|\(합\)|\(재\)|주식회사|유한회사|합자회사|유한책임회사/g;

/** 법인 형태 표기·공백·구두점을 지운 비교용 키. 브랜드·영문 표기 차이는 별칭 테이블로 다룬다. */
export function normalizeCompanyName(name: string): string {
  return name
    .normalize("NFKC")
    .replace(LEGAL_FORM, "")
    .replace(/[\s.,·ㆍ()[\]-]/g, "")
    .toUpperCase();
}
