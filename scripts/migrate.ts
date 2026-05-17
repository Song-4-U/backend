/**
 * 매우 단순한 SQL 마이그레이션 러너.
 *
 * - `db/migrations/*.sql` 을 파일명 알파벳 순으로 1번 트랜잭션 안에서 실행
 * - 적용된 파일은 `schema_migrations` 테이블에 기록하여 멱등성 보장
 *
 * 고도화 시:
 * - down 마이그레이션
 * - dirty state lock
 * - 외부 도구(node-pg-migrate, sqitch 등) 도입
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { closePool, pool } from "../src/db/pool.js";
import { logger } from "../src/lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "../db/migrations");

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function loadApplied(): Promise<Set<string>> {
  const { rows } = await pool.query<{ name: string }>(
    "SELECT name FROM schema_migrations",
  );
  return new Set(rows.map((r) => r.name));
}

async function listMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries.filter((f) => f.endsWith(".sql")).sort();
}

async function applyMigration(name: string): Promise<void> {
  const sql = await readFile(path.join(MIGRATIONS_DIR, name), "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
      name,
    ]);
    await client.query("COMMIT");
    logger.info({ name }, "migration applied");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error({ err, name }, "migration failed");
    throw err;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  await ensureMigrationsTable();
  const applied = await loadApplied();
  const files = await listMigrationFiles();

  const pending = files.filter((f) => !applied.has(f));
  if (pending.length === 0) {
    logger.info("no pending migrations");
    return;
  }

  for (const f of pending) {
    await applyMigration(f);
  }
}

main()
  .catch((err) => {
    logger.error({ err }, "migration runner failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
