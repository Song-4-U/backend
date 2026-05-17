/**
 * songs 테이블 리포지토리.
 *
 * 책임:
 * - SQL 쿼리 캡슐화 (라우트/서비스가 SQL 을 직접 모르도록)
 * - VECTOR 파라미터는 pgvector helper(`toSql`) 로 직렬화
 *
 * 참고: frontend/docs/DB_SCHEMA.md - Similarity Query Example
 */

import pgvector from "pgvector";

import { pool } from "@/db/pool.js";
import { EMBEDDING_DIM } from "@/types/api.js";

export interface SongSimilarityRow {
  id: string;
  title: string;
  artist: string;
  timbre_label: string;
  similarity: number;
}

export interface FindSimilarParams {
  timbreLabel: string;
  embedding: number[];
  topK: number;
}

export async function findSimilarSongs(
  params: FindSimilarParams,
): Promise<SongSimilarityRow[]> {
  if (params.embedding.length !== EMBEDDING_DIM) {
    throw new Error(
      `embedding length mismatch: got ${params.embedding.length}, expected ${EMBEDDING_DIM}`,
    );
  }

  const sql = `
    SELECT
      id,
      title,
      artist,
      timbre_label,
      1 - (embedding_vector <=> $2::vector) AS similarity
    FROM songs
    WHERE timbre_label = $1
    ORDER BY embedding_vector <=> $2::vector
    LIMIT $3;
  `;

  const { rows } = await pool.query<{
    id: string;
    title: string;
    artist: string;
    timbre_label: string;
    similarity: string | number;
  }>(sql, [
    params.timbreLabel,
    pgvector.toSql(params.embedding),
    params.topK,
  ]);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    artist: r.artist,
    timbre_label: r.timbre_label,
    similarity:
      typeof r.similarity === "string" ? Number(r.similarity) : r.similarity,
  }));
}
