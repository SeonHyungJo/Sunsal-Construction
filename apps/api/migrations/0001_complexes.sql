-- K-apt 공동주택 기본정보. Worker cron(apps/api/src/sync.ts)이 채운다.
CREATE TABLE complexes (
  kapt_code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  road_address TEXT,
  legal_address TEXT,
  builder_raw TEXT,          -- 시공사 원문
  approval_date TEXT,        -- 사용승인일 YYYY-MM-DD
  synced_at TEXT,            -- 기본정보 마지막 성공 수집 (ISO)
  attempted_at TEXT,         -- 기본정보 마지막 시도 (순환 순서 기준)
  error TEXT,                -- 마지막 수집 실패 사유
  listed_at TEXT NOT NULL,   -- 단지 목록에서 마지막으로 확인한 시각
  search_text TEXT NOT NULL  -- 검색용: 단지명+주소, 공백 제거·소문자 (apps/api/src/search.ts norm)
);
CREATE INDEX complexes_attempted_at ON complexes (attempted_at);

-- 한글 부분 일치 검색 (3글자 이상). content 테이블과 트리거로 동기화한다.
CREATE VIRTUAL TABLE complexes_fts USING fts5 (search_text, content = 'complexes', content_rowid = 'rowid', tokenize = 'trigram');
CREATE TRIGGER complexes_ai AFTER INSERT ON complexes BEGIN
  INSERT INTO complexes_fts (rowid, search_text) VALUES (new.rowid, new.search_text);
END;
CREATE TRIGGER complexes_ad AFTER DELETE ON complexes BEGIN
  INSERT INTO complexes_fts (complexes_fts, rowid, search_text) VALUES ('delete', old.rowid, old.search_text);
END;
CREATE TRIGGER complexes_au AFTER UPDATE OF search_text ON complexes BEGIN
  INSERT INTO complexes_fts (complexes_fts, rowid, search_text) VALUES ('delete', old.rowid, old.search_text);
  INSERT INTO complexes_fts (rowid, search_text) VALUES (new.rowid, new.search_text);
END;
