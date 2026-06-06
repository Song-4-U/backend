/**
 * core-api / inference-api 의 요청/응답 타입.
 *
 * 단일 진실의 원천:
 * - frontend/docs/API_CONTRACTS.md
 *
 * 작성 규칙:
 * - 외부로 노출되는 필드명은 snake_case (프론트와 일치)
 * - 변환은 route/service 레이어에서 처리하지 말고 그대로 직렬화
 * - 런타임 검증은 zod 스키마(`src/routes/*.schema.ts`) 에서 수행
 */

// =====================================================
// core-api: POST /uploads/presigned-url
// =====================================================

export interface PresignedUrlRequest {
  content_type: string;
}

export interface PresignedUrlResponse {
  upload_url: string;
  s3_key: string;
  expires_in: number;
}

// =====================================================
// core-api: POST /matches/by-voice
// =====================================================

export interface VoiceMatchRequest {
  s3_key: string;
  /** save_profile=true 일 때 필수. 매칭 풀에 등록될 표시 이름 */
  display_name?: string;
  /** 이번 녹음을 매칭 가능한 프로필로 저장할지 동의 여부 (기본 false) */
  save_profile?: boolean;
  gender?: string;
  vocal_range?: string;
  top_k?: number;
}

export interface VoiceMatch {
  id: string;
  display_name: string;
  timbre_label: string;
  gender?: string | null;
  vocal_range?: string | null;
  audio_url?: string | null;
  similarity: number;
}

export interface VoiceMatchResponse {
  query: {
    predicted_timbre_label: string;
    gender?: string;
    vocal_range?: string;
    top_k: number;
  };
  /** save_profile=true 로 새로 등록된 프로필 id. 저장하지 않았으면 null */
  saved_profile_id: string | null;
  matches: VoiceMatch[];
}

// =====================================================
// inference-api: POST /embed 및 POST /classify (core-api 가 호출)
// =====================================================

export interface EmbedRequestByS3Key {
  bucket: string;
  key: string;
}

export interface EmbedRequestByPresignedUrl {
  presigned_get_url: string;
}

export type EmbedRequest = EmbedRequestByS3Key | EmbedRequestByPresignedUrl;

export interface EmbedResponse {
  /** 항상 길이 512인 float 배열 */
  embedding: number[];
}

export interface ClassificationItem {
  label: string;
  score: number;
}

export interface ClassifyResponse {
  predicted_label: string;
  scores: ClassificationItem[];
}

/** inference 출력 벡터 차원. DB 스키마 VECTOR(512) 와 항상 일치. */
export const EMBEDDING_DIM = 512 as const;
