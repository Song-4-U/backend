/**
 * 음색 트윈/듀엣 매칭 유스케이스.
 *
 * 흐름 (frontend/docs/PIPELINE.md 4~7 단계):
 * 1. s3_key 로 inference-api 호출 → 512D embedding + 음색 분류 라벨
 * 2. (save_profile=true) 이번 녹음을 voice_profiles 에 등록
 * 3. timbre_label 로 후보 필터링 + pgvector ANN 검색 (본인 제외)
 * 4. VoiceMatchResponse shape 으로 반환
 */

import { env } from "@/config/env.js";
import {
  findSimilarProfiles,
  insertVoiceProfile,
} from "@/db/voiceProfiles.repository.js";
import { ValidationError } from "@/lib/errors.js";
import { classifyAudio, embedAudio } from "@/services/inference.js";
import { createDownloadPresignedUrl } from "@/services/s3.js";
import type { VoiceMatchRequest, VoiceMatchResponse } from "@/types/api.js";

interface MatchOptions {
  /** core-api 가 inference 에 bucket/key 권한이 없을 때 true */
  useDownloadPresignedUrl?: boolean;
  signal?: AbortSignal;
  requestId?: string;
}

export async function matchByVoice(
  req: VoiceMatchRequest,
  opts: MatchOptions = {},
): Promise<VoiceMatchResponse> {
  const saveProfile = req.save_profile ?? false;
  if (saveProfile && !req.display_name?.trim()) {
    throw new ValidationError(
      "display_name is required when save_profile is true",
    );
  }

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

  const timbreLabel = classification.predicted_label;

  let savedProfileId: string | null = null;
  if (saveProfile) {
    savedProfileId = await insertVoiceProfile({
      displayName: req.display_name!.trim(),
      timbreLabel,
      embedding,
      gender: req.gender,
      vocalRange: req.vocal_range,
      audioUrl: req.s3_key,
    });
  }

  const topK = req.top_k ?? 10;
  const rows = await findSimilarProfiles({
    timbreLabel,
    embedding,
    excludeId: savedProfileId ?? undefined,
    gender: req.gender,
    vocalRange: req.vocal_range,
    topK,
  });

  return {
    query: {
      predicted_timbre_label: timbreLabel,
      gender: req.gender,
      vocal_range: req.vocal_range,
      top_k: topK,
    },
    saved_profile_id: savedProfileId,
    matches: rows,
  };
}
