/**
 * 환경변수 로딩 및 검증.
 *
 * 단일 진실의 원천:
 * - .env.example
 * - docs/ENVIRONMENT.md
 *
 * 원칙:
 * - 모듈 import 시점에 1회만 검증 (fail fast)
 * - 다른 모듈은 `env` 객체만 import (process.env 직접 참조 금지)
 */

import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().url(),

  AWS_REGION: z.string().default("ap-northeast-2"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().min(1),
  S3_PRESIGN_EXPIRES_IN: z.coerce.number().int().positive().default(900),

  INFERENCE_API_URL: z.string().url(),
  INFERENCE_API_KEY: z.string().optional(),
  INFERENCE_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),

  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `[config/env] Invalid environment variables:\n${issues}\n\nSee .env.example / docs/ENVIRONMENT.md`,
    );
  }

  return parsed.data;
}

export const env: Env = loadEnv();

export const corsOrigins: string[] = env.CORS_ALLOWED_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
