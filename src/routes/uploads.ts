/**
 * POST /uploads/presigned-url
 *
 * 참고: frontend/docs/API_CONTRACTS.md
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { ValidationError } from "@/lib/errors.js";
import { createUploadPresignedUrl } from "@/services/s3.js";
import type { PresignedUrlResponse } from "@/types/api.js";

const PresignedUrlBodySchema = z.object({
  content_type: z.string().min(1),
});

export async function registerUploadRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post<{ Reply: PresignedUrlResponse }>(
    "/uploads/presigned-url",
    async (req) => {
      const parsed = PresignedUrlBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid body");
      }
      return createUploadPresignedUrl(parsed.data.content_type);
    },
  );
}
