# Backend Docs

`backend/` (core-api) 의 백엔드 전용 설계 문서입니다.

서비스 전체 (API 계약, DB 스키마, 파이프라인, 환경변수) 설계는 [`../../frontend/docs/`](../../frontend/docs) 가 단일 진실의 원천이며, 이 폴더는 그 위에서 백엔드 구현 관점의 부가 문서를 둡니다.

## 문서 목록

- [`BACKEND_STRUCTURE.md`](./BACKEND_STRUCTURE.md) — 백엔드 폴더 구조 / 레이어 책임 / 컨벤션
- [`BACKEND_TODO.md`](./BACKEND_TODO.md) — Phase별 To-Do 및 진행 현황

## 업데이트 원칙

- API 계약 / DB 스키마 / 환경변수 변경 시 `../../frontend/docs/` 를 먼저 수정한 뒤 백엔드 구현/문서를 갱신합니다.
- 백엔드 내부 구조(폴더, 레이어 책임, 의존성 정책) 변경 시 `BACKEND_STRUCTURE.md` 를 갱신합니다.
- 모든 문서 하단 "Update Log" 에 변경 이력을 남깁니다.
