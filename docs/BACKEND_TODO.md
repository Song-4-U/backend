# Backend 개발 To-Do List

> 구현 완료 시 해당 항목을 `- [x]`로 변경하고, 하단 Update Log에 날짜와 요약을 추가합니다.

---

## Phase 1 – 프로젝트 초기 세팅

- [x] Node.js + TypeScript + ESM 프로젝트 초기화 (`package.json`, `tsconfig.json`)
- [x] Fastify 설치 및 앱 빌더(`src/app.ts`) / 엔트리포인트(`src/server.ts`) 작성
- [x] `.env.example` 작성 + `docs/ENVIRONMENT.md` 와 일치
- [x] 환경변수 zod 검증 (`src/config/env.ts`) - fail fast
- [x] 공통 에러 클래스 + 응답 shape (`src/lib/errors.ts`)
- [x] Pino 로거 + request_id 헤더 propagation
- [x] `@fastify/cors` 적용 (`CORS_ALLOWED_ORIGINS` 기반)
- [x] PostgreSQL 연결 풀(`src/db/pool.ts`) + pgvector 타입 등록
- [x] DB 마이그레이션 SQL (`db/migrations/0001_init.sql`) + 러너(`scripts/migrate.ts`)
- [x] 공통 타입 정의(`src/types/api.ts`) - 프론트와 snake_case 일치
- [x] 폴더 구조 가이드 (`docs/BACKEND_STRUCTURE.md`)

---

## Phase 2 – 핵심 기능 구현

### 업로드
- [x] `POST /uploads/presigned-url` 라우트 + zod 스키마
- [x] S3 PUT presigned URL 발급 (`services/s3.ts`)
- [x] 허용 content_type / 키 컨벤션 프론트와 최종 합의 (`audio/webm`, `audio/mp4` 등 iOS 대응 완료)
- [ ] 업로드 크기 상한 정책 합의 및 적용 (S3 policy / content-length-range)

### 추론
- [x] `services/inference.ts` - `POST /embed` 호출 + timeout / shape 검증
- [ ] inference-api 인증 방식 합의 (`x-api-key` vs JWT vs SigV4)
- [ ] inference-api 가 S3 직접 접근 불가한 환경에서 download presigned URL 폴백 검증
- [ ] 재시도 정책 (네트워크/5xx) - exponential backoff 1~2회

### 매칭 (음색 트윈/듀엣)
- [x] `POST /matches/by-voice` 라우트 + zod 스키마
- [x] `services/voiceMatch.ts` - inference → (선택)프로필 등록 → pgvector 검색 조립
- [x] `db/voiceProfiles.repository.ts` - 프로필 INSERT + pgvector cosine 유사도 쿼리(본인 제외)
- [x] `timbre_label` 자동 분석 반영 및 3개 라벨(`["Normal", "Husky", "Clear"]`) 연동
- [x] `top_k` 기본/최대값 합의 (default 10, max 50 반영)
- [x] `save_profile`/`display_name` 동의 기반 프로필 등록 흐름
- [ ] 동의/프라이버시 정책 (프로필 삭제 API, 보관 기간) 정의
- [ ] 정렬/필터링 외 다양성(diversity) 정책 (선택)

---

## Phase 3 – 관측성 / 운영

- [ ] 요청별 latency 메트릭 (presign / inference / db / e2e)
- [ ] inference-api / DB 에러 비율 알람
- [ ] OpenAPI 스펙 자동 생성 (`@fastify/swagger`)
- [ ] 구조화 access log → CloudWatch / Datadog 등 적재
- [ ] graceful shutdown 시 inflight request 처리 보강

---

## Phase 4 – 배포

- [ ] Dockerfile 작성 (멀티스테이지 빌드, distroless 기반)
- [ ] CI 파이프라인 (lint + typecheck + 빌드 + 마이그레이션 dry-run)
- [ ] AWS 환경 배포 (Fargate / Lambda Web Adapter 등) 결정
- [ ] Secrets Manager / SSM 으로 비밀값 이관
- [ ] 스테이징/프로덕션 환경 분리 및 환경별 DB

---

## 프론트엔드와 합의 필요한 항목

| 항목 | 내용 | 상태 |
|------|------|------|
| `timbre_label` enum 값 | `["Normal", "Husky", "Clear"]` 세 라벨 자동 분류 적용 | 합의 완료 |
| 오디오 포맷 | `audio/webm`, `audio/mp4` 등 S3 직접 업로드 허용 | 합의 완료 |
| presigned URL 만료 시간 | 기본 900s. 운영 권장값 확인 | 확인 필요 |
| 에러 코드 목록 | `EMBEDDING_TIMEOUT`, `VALIDATION_ERROR`, `AUDIO_DOWNLOAD_FAILED` 등 | 1차 정의 |
| `top_k` 기본/최대 | default 10, max 50 | 합의 완료 |

---

## 참고 문서

- [BACKEND_STRUCTURE.md](./BACKEND_STRUCTURE.md) — 폴더 구조 / 레이어 책임
- [../../frontend/docs/API_CONTRACTS.md](../../frontend/docs/API_CONTRACTS.md) — API 계약
- [../../frontend/docs/DB_SCHEMA.md](../../frontend/docs/DB_SCHEMA.md) — DB 스키마
- [../../frontend/docs/PIPELINE.md](../../frontend/docs/PIPELINE.md) — E2E 파이프라인
- [../../frontend/docs/ENVIRONMENT.md](../../frontend/docs/ENVIRONMENT.md) — 환경변수

---

## Update Log

- 2026-06-06: 프로젝트 방향 전환(노래 추천 → 음색 트윈/듀엣 매칭). `POST /recommendations/by-timbre` → `POST /matches/by-voice`, `songs` 테이블/리포지토리 → `voice_profiles`(0003 마이그레이션), `save_profile` 동의 기반 프로필 등록 + 본인 제외 매칭, `genre` 필터 제거, 테스트(`voiceMatch.test.ts`) 갱신
- 2026-05-25: E2E 파이프라인 정렬 완료 (음색 자동 분류 및 2차 필터(성별, 장르, 음역대) 반영, iOS/Safari `audio/mp4` 지원 완료, `vitest` 테스트 작성)
- 2026-05-17: Phase 1 skeleton 완료 (Fastify + TS + pg/pgvector + S3 + inference 클라이언트, 라우트/서비스/리포지토리 레이어, 마이그레이션 러너, 문서 초안)
