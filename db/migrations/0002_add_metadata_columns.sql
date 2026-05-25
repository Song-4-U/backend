-- =====================================================
-- 0002_add_metadata_columns.sql
-- songs 테이블에 url 및 추가 검색 옵션(genre, gender, vocal_range) 컬럼을 추가합니다.
-- =====================================================

ALTER TABLE songs ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS vocal_range TEXT;
