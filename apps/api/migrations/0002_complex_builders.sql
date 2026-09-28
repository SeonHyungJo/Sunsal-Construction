-- 건설사 → 시공 단지. 공동시공 단지는 참여 회사마다 한 행. sync.ts syncBasis가 채운다 (apps/api/src/builders.ts).
-- 기존 수집분은 apps/api/scripts/index-builders.ts로 한 번 채운다.
CREATE TABLE complex_builders (
  name TEXT NOT NULL,       -- 정규화한 시공사 이름 (별칭은 조회 시 푼다)
  kapt_code TEXT NOT NULL REFERENCES complexes (kapt_code),
  PRIMARY KEY (name, kapt_code)
);
CREATE INDEX complex_builders_kapt_code ON complex_builders (kapt_code);
