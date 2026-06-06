-- =====================================================
-- 0003_voice_profiles.sql
-- 프로젝트 방향 전환: 노래 추천(songs) → 음색 트윈/듀엣 매칭(voice_profiles)
-- 단일 진실의 원천: frontend/docs/DB_SCHEMA.md
--
-- 주의: songs 테이블은 실제 적재된 적이 없으며 더 이상 사용하지 않으므로 제거합니다.
-- =====================================================

-- -----------------------------------------------------
-- Core Table: voice_profiles
-- 사용자가 동의하에 등록한 음색 프로필 (매칭 풀)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  timbre_label TEXT NOT NULL,
  embedding_vector VECTOR(512) NOT NULL,
  gender TEXT,
  vocal_range TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- Indexes
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_voice_profiles_timbre_label
  ON voice_profiles (timbre_label);

-- Cosine similarity 기반 ANN index.
-- 대규모 데이터셋 전환 시 hnsw 로 재평가.
CREATE INDEX IF NOT EXISTS idx_voice_profiles_embedding_ivfflat
  ON voice_profiles USING ivfflat (embedding_vector vector_cosine_ops)
  WITH (lists = 100);

-- -----------------------------------------------------
-- updated_at 자동 갱신 트리거 (set_updated_at 은 0001 에서 생성됨)
-- -----------------------------------------------------
DROP TRIGGER IF EXISTS trg_voice_profiles_set_updated_at ON voice_profiles;
CREATE TRIGGER trg_voice_profiles_set_updated_at
BEFORE UPDATE ON voice_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------
-- 더 이상 사용하지 않는 songs 테이블 제거
-- -----------------------------------------------------
DROP TRIGGER IF EXISTS trg_songs_set_updated_at ON songs;
DROP TABLE IF EXISTS songs;
