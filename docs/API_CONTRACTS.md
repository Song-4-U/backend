# API Contracts

## core-api

### `POST /uploads/presigned-url`

업로드용 S3 Presigned URL을 발급합니다.

Request:

```json
{
  "content_type": "audio/webm"
}
```

Response:

```json
{
  "upload_url": "https://...",
  "s3_key": "uploads/2026/04/27/uuid.webm",
  "expires_in": 900
}
```

---

### `POST /matches/by-voice`

업로드된 오디오를 기준으로 **음색이 비슷한 다른 사용자(음색 트윈/듀엣 파트너)** 를 조회합니다.
`save_profile` 이 true 면 이번 녹음을 매칭 가능한 프로필로 등록한 뒤 검색합니다(본인 제외).

Request:

```json
{
  "s3_key": "uploads/2026/04/27/uuid.webm",
  "display_name": "Alex",
  "save_profile": true,
  "gender": "female",
  "vocal_range": "alto",
  "top_k": 10
}
```

- `s3_key` (필수): 업로드된 녹음의 S3 key
- `display_name` (옵션): 프로필 등록 시 표시 이름. `save_profile=true` 면 필수
- `save_profile` (옵션, 기본 false): 이번 녹음을 매칭 풀에 프로필로 저장할지 동의 여부
- `gender` / `vocal_range` (옵션): 매칭 2차 필터
- `top_k` (옵션, 기본 10, 최대 50)

Response:

```json
{
  "query": {
    "predicted_timbre_label": "Husky",
    "gender": "female",
    "vocal_range": "alto",
    "top_k": 10
  },
  "saved_profile_id": "f89a5c54-3d73-47d4-8a3f-8f5c30960e42",
  "matches": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "display_name": "Aria",
      "timbre_label": "Husky",
      "gender": "female",
      "vocal_range": "soprano",
      "audio_url": "https://...",
      "similarity": 0.9231
    }
  ]
}
```

- `saved_profile_id`: `save_profile=true` 로 새로 등록된 프로필 id. 저장하지 않았으면 `null`
- `matches[].audio_url`: 상대 프로필의 녹음 재생용 URL (옵션)

## inference-api

### `POST /embed`

S3 오디오 입력으로부터 512차원 임베딩을 생성합니다.

Request (option 1):

```json
{
  "bucket": "song4u-audio-prod",
  "key": "uploads/2026/04/27/uuid.webm"
}
```

Request (option 2):

```json
{
  "presigned_get_url": "https://..."
}
```

Response:

```json
{
  "embedding": [0.0021, -0.113, 0.0042]
}
```

> 실제 응답에서 `embedding` 길이는 항상 512여야 합니다.

---

### `POST /classify`

S3 오디오 입력으로부터 음색 분류를 수행합니다.

Request (option 1/2 동일):

```json
{
  "bucket": "song4u-audio-prod",
  "key": "uploads/2026/04/27/uuid.webm"
}
```

Response:

```json
{
  "predicted_label": "Normal"
}
```

---

## Error Shape (권장)

```json
{
  "error": {
    "code": "EMBEDDING_TIMEOUT",
    "message": "Inference request timed out",
    "request_id": "req_..."
  }
}
```

## Update Log

- 2026-06-06: 프로젝트 방향 전환(노래 추천 → 음색 트윈/듀엣 매칭). `POST /recommendations/by-timbre` → `POST /matches/by-voice` 로 교체, 응답이 곡 목록(`items`) → 사용자 음색 프로필 매칭(`matches`)으로 변경, `save_profile`/`display_name`/`saved_profile_id` 추가, `genre` 제거
- 2026-05-25: `POST /recommendations/by-timbre`에 2차 필터(성별, 장르, 음역대) 정보 추가 및 `predicted_timbre_label`로 응답 필드 변경, `POST /classify` 엔드포인트 계약 신설
- 2026-04-27: core-api / inference-api 초기 계약 정의
