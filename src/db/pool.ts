/**
 * PostgreSQL 연결 풀.
 *
 * - `pg` 풀을 프로세스 전역으로 1개 유지
 * - `pgvector`의 `registerType` 으로 VECTOR 타입을 number[] 로 받도록 등록
 * - 그래cefully shutdown 시 `closePool()` 호출
 *
 * 참고: frontend/docs/DB_SCHEMA.md
 */

import pg from "pg";
import pgvector from "pgvector/pg";

import { env } from "@/config/env.js";
import { logger } from "@/lib/logger.js";

const { Pool } = pg;

export type PgPool = pg.Pool;
export type PgClient = pg.PoolClient;

export const pool: PgPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  logger.error({ err }, "pg pool error");
});

/**
 * 모든 새 connection 에 pgvector 타입을 등록.
 *
 * 풀 connect 시 1회씩 실행되며, 이미 등록된 경우 pgvector 가 idempotent 하게 처리.
 */
pool.on("connect", async (client) => {
  try {
    await pgvector.registerType(client);
  } catch (err) {
    logger.error({ err }, "failed to register pgvector type");
  }
});

export async function closePool(): Promise<void> {
  await pool.end();
}
