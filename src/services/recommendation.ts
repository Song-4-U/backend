/**
 * 음색 기반 추천 유스케이스.
 *
 * 흐름 (frontend/docs/PIPELINE.md 4~6 단계):
 * 1. s3_key 로 inference-api 호출 → 512D embedding 획득
 * 2. timbre_label 로 후보 필터링 + pgvector ANN 검색
 * 3. RecommendationsResponse shape 으로 반환
 */

import { findSimilarSongs } from "@/db/songs.repository.js";
import { embedAudio, classifyAudio } from "@/services/inference.js";
import { env } from "@/config/env.js";
import { createDownloadPresignedUrl } from "@/services/s3.js";
import type {
  RecommendationsRequest,
  RecommendationsResponse,
} from "@/types/api.js";

interface RecommendOptions {
  /** core-api 가 inference 에 bucket/key 권한이 없을 때 true */
  useDownloadPresignedUrl?: boolean;
  signal?: AbortSignal;
  requestId?: string;
}

export async function recommendByTimbre(
  req: RecommendationsRequest,
  opts: RecommendOptions = {},
): Promise<RecommendationsResponse> {
  const embedRequest = opts.useDownloadPresignedUrl
    ? {
        presigned_get_url: await createDownloadPresignedUrl(req.s3_key),
      }
    : {
        bucket: env.S3_BUCKET,
        key: req.s3_key,
      };

  const [embedding, classification] = await Promise.all([
    embedAudio(embedRequest, {
      signal: opts.signal,
      requestId: opts.requestId,
    }),
    classifyAudio(embedRequest, {
      signal: opts.signal,
      requestId: opts.requestId,
    }),
  ]);

  const topK = req.top_k ?? 10;
  const rows = await findSimilarSongs({
    timbreLabel: classification.predicted_label,
    embedding,
    gender: req.gender,
    vocalRange: req.vocal_range,
    genre: req.genre,
    topK,
  });

  return {
    query: {
      predicted_timbre_label: classification.predicted_label,
      gender: req.gender,
      vocal_range: req.vocal_range,
      genre: req.genre,
      top_k: topK,
    },
    items: rows,
  };
}
