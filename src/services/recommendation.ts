/**
 * 음색 기반 추천 유스케이스.
 *
 * 흐름 (frontend/docs/PIPELINE.md 4~6 단계):
 * 1. s3_key 로 inference-api 호출 → 512D embedding 획득
 * 2. timbre_label 로 후보 필터링 + pgvector ANN 검색
 * 3. RecommendationsResponse shape 으로 반환
 */

import { findSimilarSongs } from "@/db/songs.repository.js";
import { embedAudio } from "@/services/inference.js";
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

  const embedding = await embedAudio(embedRequest, {
    signal: opts.signal,
    requestId: opts.requestId,
  });

  const rows = await findSimilarSongs({
    timbreLabel: req.timbre_label,
    embedding,
    topK: req.top_k,
  });

  return {
    query: {
      timbre_label: req.timbre_label,
      top_k: req.top_k,
    },
    items: rows,
  };
}
