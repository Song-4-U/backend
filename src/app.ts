/**
 * Fastify app 빌더.
 *
 * - 라우트/플러그인 등록 + 공통 에러 핸들러
 * - 테스트/서버 부트스트랩 양쪽에서 재사용
 */

import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import fastify, { type FastifyInstance } from "fastify";

import { corsOrigins, env } from "@/config/env.js";
import { ApiError, toApiErrorBody } from "@/lib/errors.js";
import { registerHealthRoutes } from "@/routes/health.js";
import { registerRecommendationRoutes } from "@/routes/recommendations.js";
import { registerUploadRoutes } from "@/routes/uploads.js";

export interface BuildAppOptions {
  /** 추가 logger 설정. 기본값은 env.LOG_LEVEL 사용 */
  logger?: boolean | object;
}

export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = fastify({
    logger: opts.logger ?? {
      level: env.LOG_LEVEL,
      base: { service: "core-api", env: env.NODE_ENV },
    },
    genReqId: (req) => {
      const headerId = req.headers["x-request-id"];
      if (typeof headerId === "string" && headerId.length > 0) return headerId;
      return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    },
    requestIdHeader: "x-request-id",
    requestIdLogLabel: "request_id",
  });

  await app.register(sensible);
  await app.register(cors, {
    origin: corsOrigins.includes("*") ? true : corsOrigins,
    credentials: true,
  });

  app.addHook("onSend", async (req, reply, payload) => {
    reply.header("x-request-id", req.id);
    return payload;
  });

  await registerHealthRoutes(app);
  await registerUploadRoutes(app);
  await registerRecommendationRoutes(app);

  app.setNotFoundHandler((_req, reply) =>
    reply.code(404).send({
      error: { code: "NOT_FOUND", message: "Route not found" },
    }),
  );

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ApiError) {
      req.log.warn(
        { err, code: err.code, statusCode: err.statusCode },
        "api error",
      );
      return reply.code(err.statusCode).send(toApiErrorBody(err, req.id));
    }

    if (err.validation) {
      req.log.warn({ err }, "validation error");
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: err.message,
          request_id: req.id,
        },
      });
    }

    req.log.error({ err }, "unhandled error");
    const statusCode = err.statusCode ?? 500;
    return reply.code(statusCode).send({
      error: {
        code: "INTERNAL_ERROR",
        message:
          env.NODE_ENV === "production"
            ? "Internal server error"
            : (err.message ?? "Internal server error"),
        request_id: req.id,
      },
    });
  });

  return app;
}
