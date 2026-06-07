# End-to-End Pipeline

## 목적

사용자 녹음 오디오를 기반으로 **음색이 비슷한 다른 사용자(음색 트윈/듀엣 파트너)** 를 찾아주는 전체 흐름을 정의합니다.

## High-Level Flow

1. Frontend가 `core-api`에 업로드용 Presigned URL 요청
2. Frontend가 오디오 파일을 S3에 직접 업로드
3. Frontend가 `core-api`에 매칭 요청 (`s3_key`, `display_name`?, `save_profile`?, `gender`?, `vocal_range`?, `top_k`)
4. `core-api`가 `inference-api`를 호출해 512D 임베딩 및 음색 분류 라벨을 병렬로 획득
5. (`save_profile=true` 인 경우) `core-api`가 이번 임베딩을 `voice_profiles` 에 등록
6. `core-api`가 PostgreSQL(pgvector)에서 음색 라벨 매칭 + 2차 필터(성별, 음역대)로 유사 프로필 검색 (본인 제외)
7. `core-api`가 매칭 결과를 Frontend에 반환

## Sequence (Detailed)

### 1) Presigned URL 발급
- Client -> `POST /uploads/presigned-url` (`core-api`)
- Response: 업로드 URL, object key, 만료 시간

### 2) S3 Direct Upload
- Client -> S3 (PUT)
- 업로드 완료 후 object key 보관

### 3) Match Request
- Client -> `POST /matches/by-voice`
- Payload: `s3_key`, `display_name` (옵션), `save_profile` (옵션), `gender` (옵션), `vocal_range` (옵션), `top_k`

### 4) Inference
- `core-api` -> `inference-api /embed` & `/classify` (병렬 호출)
- Input: S3 bucket/key 또는 presigned GET URL
- Output: `embedding[512]` 및 `predicted_label` ("Normal", "Husky", "Clear" 중 하나)

### 5) (옵션) 프로필 등록
- `save_profile=true` 면 `voice_profiles` 에 `display_name`/`timbre_label`/`embedding`/`gender`/`vocal_range`/`audio_url` INSERT
- 반환된 `saved_profile_id` 는 다음 단계에서 본인 제외에 사용

### 6) Vector Similarity Query
- `WHERE timbre_label = :predicted_label`
- 방금 등록한 본인 프로필 제외 (`AND id <> :saved_profile_id`)
- (옵션) `AND gender = :gender AND vocal_range = :vocal_range`
- `ORDER BY embedding_vector <=> :embedding::vector`
- `LIMIT :top_k`

### 7) Response
- 예측한 `predicted_timbre_label`, `saved_profile_id`, 매칭 사용자 목록(표시 이름/음색/유사도/성별/음역대/오디오 URL) 반환

## Failure Handling

- S3 업로드 실패: URL 재발급 또는 재시도 가이드 반환
- Inference 타임아웃: 504/재시도 가능 상태코드 반환
- Embedding shape mismatch: 422로 검증 실패 처리
- DB 오류: 추적 가능한 요청 ID 포함한 500 반환

## Observability

- 공통 `request_id`를 core-api -> inference-api -> DB 쿼리 로그에 전파
- 주요 지표:
  - presigned URL 발급 시간
  - inference latency (P50/P95/P99)
  - vector query latency
  - end-to-end recommendation latency

## Update Log

- 2026-06-06: 프로젝트 방향 전환(노래 추천 → 음색 트윈/듀엣 매칭). `/recommendations/by-timbre` → `/matches/by-voice`, 곡 검색 → 사용자 음색 프로필 매칭, `save_profile` 등록 단계 및 본인 제외 로직 추가, `genre` 필터 제거
- 2026-05-25: 수동 음색 라벨 제거, 음색 자동 분류 엔드포인트(/classify) 및 2차 메타데이터 필터(성별, 음역대, 장르) 반영
- 2026-04-27: 초기 파이프라인 정의 및 실패/관측 항목 추가
