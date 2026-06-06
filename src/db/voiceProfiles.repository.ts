/**
 * voice_profiles 테이블 리포지토리.
 *
 * 책임:
 * - SQL 쿼리 캡슐화 (라우트/서비스가 SQL 을 직접 모르도록)
 * - VECTOR 파라미터는 pgvector helper(`toSql`) 로 직렬화
 *
 * 참고: frontend/docs/DB_SCHEMA.md - voice_profiles / Similarity Query Example
 */

import pgvector from "pgvector";

import { pool } from "@/db/pool.js";
import { EMBEDDING_DIM } from "@/types/api.js";

export interface VoiceProfileMatchRow {
  id: string;
  display_name: string;
  timbre_label: string;
  gender?: string | null;
  vocal_range?: string | null;
  audio_url?: string | null;
  similarity: number;
}

export interface InsertVoiceProfileParams {
  displayName: string;
  timbreLabel: string;
  embedding: number[];
  gender?: string;
  vocalRange?: string;
  audioUrl?: string;
}

export interface FindSimilarParams {
  timbreLabel: string;
  embedding: number[];
  /** 매칭 결과에서 제외할 프로필 id (방금 등록한 본인) */
  excludeId?: string;
  gender?: string;
  vocalRange?: string;
  topK: number;
}

function assertEmbeddingDim(embedding: number[]): void {
  if (embedding.length !== EMBEDDING_DIM) {
    throw new Error(
      `embedding length mismatch: got ${embedding.length}, expected ${EMBEDDING_DIM}`,
    );
  }
}

/**
 * 새 음색 프로필을 등록하고 생성된 id 를 반환합니다.
 */
export async function insertVoiceProfile(
  params: InsertVoiceProfileParams,
): Promise<string> {
  assertEmbeddingDim(params.embedding);

  const { rows } = await pool.query<{ id: string }>(
    `
    INSERT INTO voice_profiles
      (display_name, timbre_label, embedding_vector, gender, vocal_range, audio_url)
    VALUES ($1, $2, $3::vector, $4, $5, $6)
    RETURNING id
    `,
    [
      params.displayName,
      params.timbreLabel,
      pgvector.toSql(params.embedding),
      params.gender ?? null,
      params.vocalRange ?? null,
      params.audioUrl ?? null,
    ],
  );

  return rows[0]!.id;
}

/**
 * 음색 라벨이 같은 프로필 중 임베딩이 가장 가까운 순으로 조회합니다.
 */
export async function findSimilarProfiles(
  params: FindSimilarParams,
): Promise<VoiceProfileMatchRow[]> {
  assertEmbeddingDim(params.embedding);

  let sql = `
    SELECT
      id,
      display_name,
      timbre_label,
      gender,
      vocal_range,
      audio_url,
      1 - (embedding_vector <=> $2::vector) AS similarity
    FROM voice_profiles
    WHERE timbre_label = $1
      AND ($3::uuid IS NULL OR id <> $3)
  `;
  const queryParams: unknown[] = [
    params.timbreLabel,
    pgvector.toSql(params.embedding),
    params.excludeId ?? null,
  ];

  let paramIndex = 4;
  if (params.gender) {
    sql += ` AND gender = $${paramIndex}`;
    queryParams.push(params.gender);
    paramIndex++;
  }
  if (params.vocalRange) {
    sql += ` AND vocal_range = $${paramIndex}`;
    queryParams.push(params.vocalRange);
    paramIndex++;
  }

  sql += `
    ORDER BY embedding_vector <=> $2::vector
    LIMIT $${paramIndex}
  `;
  queryParams.push(params.topK);

  const { rows } = await pool.query<{
    id: string;
    display_name: string;
    timbre_label: string;
    gender: string | null;
    vocal_range: string | null;
    audio_url: string | null;
    similarity: string | number;
  }>(sql, queryParams);

  return rows.map((r) => ({
    id: r.id,
    display_name: r.display_name,
    timbre_label: r.timbre_label,
    gender: r.gender,
    vocal_range: r.vocal_range,
    audio_url: r.audio_url,
    similarity:
      typeof r.similarity === "string" ? Number(r.similarity) : r.similarity,
  }));
}
