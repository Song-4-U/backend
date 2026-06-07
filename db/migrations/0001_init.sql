-- =====================================================
-- 0001_init.sql
-- 단일 진실의 원천: docs/DB_SCHEMA.md
-- =====================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- -----------------------------------------------------
-- Core Table: songs
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  timbre_label TEXT NOT NULL,
  embedding_vector VECTOR(512) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- Indexes
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_songs_timbre_label
  ON songs (timbre_label);

-- Cosine similarity 기반 ANN index.
-- 대규모 데이터셋 전환 시 hnsw 로 재평가.
CREATE INDEX IF NOT EXISTS idx_songs_embedding_ivfflat
  ON songs USING ivfflat (embedding_vector vector_cosine_ops)
  WITH (lists = 100);

-- -----------------------------------------------------
-- updated_at 자동 갱신 트리거 (옵션 도입)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_songs_set_updated_at ON songs;
CREATE TRIGGER trg_songs_set_updated_at
BEFORE UPDATE ON songs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
