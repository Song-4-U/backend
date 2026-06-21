# Backend Docs

`backend/` (core-api) 의 설계 문서입니다.

서비스 전체 (API 계약, DB 스키마, 파이프라인, 환경변수) 설계 문서의 단일 진실의 원천(SSOT)이며, frontend / ai-server 는 이 폴더의 문서를 참조합니다.

## 공용 계약 문서 (SSOT)

- [`API_CONTRACTS.md`](./API_CONTRACTS.md) — core-api / inference-api 요청/응답 스펙
- [`DB_SCHEMA.md`](./DB_SCHEMA.md) — PostgreSQL + pgvector 스키마
- [`PIPELINE.md`](./PIPELINE.md) — E2E 파이프라인
- [`ENVIRONMENT.md`](./ENVIRONMENT.md) — 환경변수 정의 / 환경별 운영 원칙

## 백엔드 전용 문서

- [`BACKEND_STRUCTURE.md`](./BACKEND_STRUCTURE.md) — 백엔드 폴더 구조 / 레이어 책임 / 컨벤션
- [`BACKEND_TODO.md`](./BACKEND_TODO.md) — Phase별 To-Do 및 진행 현황

## 업데이트 원칙

- API 계약 / DB 스키마 / 환경변수 변경 시 이 폴더의 문서를 먼저 수정한 뒤 백엔드 구현/문서를 갱신합니다.
- 백엔드 내부 구조(폴더, 레이어 책임, 의존성 정책) 변경 시 `BACKEND_STRUCTURE.md` 를 갱신합니다.
- 모든 문서 하단 "Update Log" 에 변경 이력을 남깁니다.
