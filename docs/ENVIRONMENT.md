# Environment Variables Guide

## 원칙

- 비밀값은 `.env`에만 저장하고 레포에는 커밋하지 않습니다.
- 레포에는 `.env.example`만 두고, 모든 필수 키를 문서화합니다.
- 루트/서비스별로 범위를 분리해 최소 권한 원칙을 지킵니다.

## Root `.env.example` (공통 참조)

```env
APP_ENV=local
AWS_REGION=ap-northeast-2
S3_BUCKET=song4u-audio-dev
```

## `core-api/.env.example`

```env
NODE_ENV=development
PORT=8080

DATABASE_URL=postgresql://user:pass@localhost:5432/song4u

AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=song4u-audio-dev

INFERENCE_API_URL=https://example.lambda-url.aws
INFERENCE_API_KEY=

JWT_SECRET=
JWT_EXPIRES_IN=7d
```

## `inference-api/.env.example`

```env
APP_ENV=development
PORT=8000
LOG_LEVEL=info
CORS_ALLOWED_ORIGINS=http://localhost:8080
API_KEY=

AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=song4u-audio-dev

MODEL_PATH=./best_model_Exp2_Low_LR.pth
MODEL_DEVICE=auto
EMBEDDING_DIM=512
NUM_CLASSES=3

AUDIO_SAMPLE_RATE=22050
AUDIO_N_FFT=1024
AUDIO_HOP_LENGTH=256
AUDIO_N_MELS=128
AUDIO_MAX_DURATION_SEC=5.0

HTTP_DOWNLOAD_TIMEOUT_SEC=20
HTTP_DOWNLOAD_MAX_BYTES=52428800
```

## `frontend/.env.example`

```env
NEXT_PUBLIC_CORE_API_BASE_URL=http://localhost:8080
```

## 운영 권장사항

- 로컬/스테이징/프로덕션 `.env`를 완전히 분리
- 장기적으로는 AWS Secrets Manager 또는 SSM Parameter Store 사용
- 키 순환(rotation) 정책 수립

## Update Log

- 2026-05-25: 실제 inference-api(ai-server) 환경변수 항목(모델 설정, 전처리 설정 및 다운로드 설정)에 맞추어 동기화 완료
- 2026-04-27: 초기 환경변수 템플릿 및 운영 원칙 문서화
