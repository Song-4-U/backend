/**
 * POST /recommendations/by-timbre
 *
 * 참고:
 * - frontend/docs/API_CONTRACTS.md
 * - frontend/docs/PIPELINE.md
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { ValidationError } from "@/lib/errors.js";
import { recommendByTimbre } from "@/services/recommendation.js";
import type { RecommendationsResponse } from "@/types/api.js";

const RecommendationsBodySchema = z.object({
  s3_key: z.string().min(1),
  gender: z.string().optional(),
  vocal_range: z.string().optional(),
  genre: z.string().optional(),
  top_k: z.number().int().min(1).max(50).default(10),
});

export async function registerRecommendationRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post<{ Reply: RecommendationsResponse }>(
    "/recommendations/by-timbre",
    async (req) => {
      const parsed = RecommendationsBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues[0]?.message ?? "Invalid body",
        );
      }

      return recommendByTimbre(parsed.data, {
        requestId: req.id,
      });
    },
  );
}
