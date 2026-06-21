# DB Schema (PostgreSQL + pgvector)

## 개요

본 서비스는 PostgreSQL을 메인 저장소로 사용하고, 음색 임베딩 매칭을 위해 `pgvector`를 사용합니다.
"노래"가 아니라 **사용자 음색 프로필** 간 유사도 매칭(음색 트윈/듀엣 파트너)을 수행합니다.

## Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Core Table: voice_profiles

사용자가 동의하에 등록한 음색 프로필. 매칭 풀이 됩니다.

```sql
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
```

## Index Strategy

```sql
CREATE INDEX IF NOT EXISTS idx_voice_profiles_timbre_label
  ON voice_profiles (timbre_label);
```

매칭 인덱스(코사인 거리 기준):

```sql
CREATE INDEX IF NOT EXISTS idx_voice_profiles_embedding_ivfflat
  ON voice_profiles USING ivfflat (embedding_vector vector_cosine_ops)
  WITH (lists = 100);
```

> 참고: 대규모 데이터셋에서는 `hnsw`를 고려할 수 있으며, 데이터 볼륨/지연 SLA 기준으로 재평가합니다.

## Similarity Query Example

```sql
SELECT
  id,
  display_name,
  timbre_label,
  gender,
  vocal_range,
  audio_url,
  1 - (embedding_vector <=> $2::vector) AS similarity
FROM voice_profiles
WHERE timbre_label = $1
  AND ($3::uuid IS NULL OR id <> $3)   -- 방금 저장한 본인 프로필 제외
  -- 동적 필터 추가 가능 (예시)
  -- AND gender = $4
  -- AND vocal_range = $5
ORDER BY embedding_vector <=> $2::vector
LIMIT $6; -- top-k
```

파라미터:
- `$1`: timbre label (TEXT)
- `$2`: query embedding vector (VECTOR(512))
- `$3`: (옵션) 제외할 본인 프로필 id (방금 등록한 경우)
- `$4` / `$5`: (옵션) gender, vocal_range
- `$6`: top-k limit (INT)

## Suggested Future Tables

- `users`: 인증/권한 정보, 프로필 소유자 연결
- `match_requests`: 매칭 요청 이력 및 디버깅 로그
- `audio_assets`: 업로드 원본(S3 key), 처리 상태, 생성 임베딩 참조

## Migration Notes

- `vector(512)` 차원은 inference 모델 출력과 항상 일치해야 함
- 모델 차원 변경 시 스키마/인덱스/쿼리를 동시에 마이그레이션
- `updated_at` 자동 갱신 트리거는 추후 도입 가능

## Update Log

- 2026-06-06: 프로젝트 방향 전환(노래 추천 → 음색 트윈/듀엣 매칭). `songs` → `voice_profiles` 테이블로 교체(0003 마이그레이션), `title`/`artist`/`url`/`genre` 제거 및 `display_name`/`audio_url` 도입, 본인 프로필 제외 조건 추가
- 2026-05-25: 0002 마이그레이션 반영에 따른 url 및 추가 검색 옵션(genre, gender, vocal_range) 컬럼 추가 및 유사도 쿼리 갱신
- 2026-04-27: 초기 스키마 및 유사도 검색/인덱스 전략 문서화
