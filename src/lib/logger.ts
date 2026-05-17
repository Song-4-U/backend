/**
 * 공용 Pino 로거.
 *
 * - Fastify가 내부 로거로 사용하므로, 별도 모듈에서 import 할 때만 이 인스턴스를 직접 사용
 * - 운영 환경에서는 JSON 그대로 stdout, 로컬은 pretty 출력은 추후 도입 가능
 */

import { pino } from "pino";

import { env } from "@/config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: "core-api",
    env: env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
