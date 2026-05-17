/**
 * core-api 엔트리포인트.
 *
 * - buildApp() 으로 Fastify 인스턴스 생성 후 listen
 * - SIGINT/SIGTERM 에 대해 graceful shutdown (HTTP 종료 + DB 풀 종료)
 */

import { buildApp } from "@/app.js";
import { env } from "@/config/env.js";
import { closePool } from "@/db/pool.js";
import { logger } from "@/lib/logger.js";

async function main(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({ host: "0.0.0.0", port: env.PORT });
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "core-api listening");
  } catch (err) {
    logger.error({ err }, "failed to start server");
    process.exit(1);
  }

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.info({ signal }, "shutdown signal received");
    try {
      await app.close();
      await closePool();
      logger.info("shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "fatal startup error");
  process.exit(1);
});
