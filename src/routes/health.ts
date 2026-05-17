/**
 * Health check.
 *
 * - GET /health  : liveness (의존성 검사 X)
 * - GET /ready   : readiness (DB ping 포함)
 */

import type { FastifyInstance } from "fastify";

import { pool } from "@/db/pool.js";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({ status: "ok" }));

  app.get("/ready", async (_req, reply) => {
    try {
      await pool.query("SELECT 1");
      return { status: "ready" };
    } catch (err) {
      app.log.error({ err }, "readiness check failed");
      return reply.code(503).send({ status: "not_ready" });
    }
  });
}
