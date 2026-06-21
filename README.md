# Song-4-U core-api

> "음색 기반 음색 트윈/듀엣 매칭 서비스"의 메인 백엔드(`core-api`)입니다.
> S3 presigned URL 발급, inference-api 호출, pgvector 기반 음색 프로필 유사도 매칭을 담당합니다.

전체 서비스 설계 문서는 [`docs/`](./docs) 를 참고하세요.

---

## 기술 스택

| 영역 | 사용 기술 |
|------|-----------|
| 런타임 | Node.js ≥ 20 (ESM) |
| 언어 | TypeScript 5 |
| 웹 프레임워크 | [Fastify 5](https://fastify.dev) (+ `@fastify/cors`, `@fastify/sensible`) |
| 검증 | [Zod](https://zod.dev) |
| DB 클라이언트 | `pg` + [`pgvector`](https://github.com/pgvector/pgvector-node) |
| AWS | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` |
| 로깅 | [Pino](https://getpino.io) |
| Dev runner | [tsx](https://github.com/privatenumber/tsx) |

---

## 폴더 구조 요약

```
backend/
├── src/
│   ├── server.ts             엔트리포인트 (listen + graceful shutdown)
│   ├── app.ts                Fastify 인스턴스 빌더 + 공통 에러 핸들러
│   ├── config/env.ts         dotenv + zod 환경변수 검증
│   ├── routes/               HTTP 라우트 (얇은 어댑터)
│   ├── services/             도메인 유스케이스 (s3, inference, voiceMatch)
│   ├── db/                   pg 풀 + 리포지토리 (SQL 캡슐화)
│   ├── lib/                  errors, logger 등 공용 유틸
│   └── types/api.ts          요청/응답 타입 (프론트와 동일 snake_case)
├── db/migrations/            SQL 마이그레이션 (.sql)
├── scripts/migrate.ts        단순 마이그레이션 러너
└── docs/                     백엔드 전용 문서 (구조/TODO)
```

레이어 책임 분리, path alias(`@/*`) 등은 [`docs/BACKEND_STRUCTURE.md`](./docs/BACKEND_STRUCTURE.md) 참고.

---

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env
```

| 변수 | 설명 |
|------|------|
| `PORT` | core-api 리슨 포트 (기본 `8080`) |
| `DATABASE_URL` | PostgreSQL 접속 문자열 (pgvector 확장 필요) |
| `S3_BUCKET` / `AWS_REGION` / `AWS_*` | 업로드용 S3 버킷 및 자격증명 |
| `INFERENCE_API_URL` | `inference-api` 베이스 URL |
| `CORS_ALLOWED_ORIGINS` | 콤마(,) 구분 origin 목록 |

전체 변수는 [`.env.example`](./.env.example) 과 [`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md) 참고.

### 3. PostgreSQL 준비

`pgvector` 확장이 설치된 PostgreSQL 이 필요합니다 (로컬 docker 예시):

```bash
docker run -d --name song4u-pg \
  -e POSTGRES_PASSWORD=pass \
  -e POSTGRES_USER=user \
  -e POSTGRES_DB=song4u \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

### 4. 마이그레이션 적용

```bash
npm run db:migrate
```

`db/migrations/*.sql` 을 알파벳 순으로 적용하고 `schema_migrations` 테이블에 기록합니다.

### 5. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:8080/health](http://localhost:8080/health) 에서 `{ "status": "ok" }` 응답을 확인할 수 있습니다.

### 6. 빌드 / 프로덕션 실행

```bash
npm run build
npm start
```

---

## API 요약

`core-api` 가 제공하는 엔드포인트 (자세한 계약은 [`docs/API_CONTRACTS.md`](./docs/API_CONTRACTS.md)).

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/health` | liveness |
| `GET` | `/ready` | readiness (DB ping 포함) |
| `POST` | `/uploads/presigned-url` | S3 업로드용 presigned URL 발급 |
| `POST` | `/matches/by-voice` | 업로드 오디오 기준 음색 트윈/듀엣 파트너 매칭 |

표준 에러 응답 shape:

```json
{
  "error": {
    "code": "EMBEDDING_TIMEOUT",
    "message": "...",
    "request_id": "req_..."
  }
}
```

응답 헤더에 항상 `x-request-id` 가 포함됩니다 (요청 헤더로 들어온 값이 있으면 그대로 전파).

---

## ⚠ 주의사항 및 다음 단계

매칭 풀(`voice_profiles`)은 **별도 적재(ETL)가 필요 없습니다.** 사용자가 `save_profile=true` 로 동의하며 매칭을 요청할 때마다 프로필이 쌓이는 구조입니다. 초기에는 매칭 후보가 적을 수 있으므로, 시연용 시드 프로필을 몇 개 넣어두는 것을 권장합니다(동의/프라이버시 정책은 `docs/BACKEND_TODO.md` 참고).

---

## 문서 인덱스

- [`docs/BACKEND_STRUCTURE.md`](./docs/BACKEND_STRUCTURE.md) — 백엔드 폴더 구조 / 레이어 책임
- [`docs/BACKEND_TODO.md`](./docs/BACKEND_TODO.md) — Phase별 To-Do
- [`docs/API_CONTRACTS.md`](./docs/API_CONTRACTS.md) — API 요청/응답 스펙
- [`docs/DB_SCHEMA.md`](./docs/DB_SCHEMA.md) — PostgreSQL + pgvector 스키마
- [`docs/PIPELINE.md`](./docs/PIPELINE.md) — E2E 파이프라인
- [`docs/ENVIRONMENT.md`](./docs/ENVIRONMENT.md) — 환경변수 운영 원칙
