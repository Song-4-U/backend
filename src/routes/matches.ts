/**
 * POST /matches/by-voice
 *
 * 참고:
 * - docs/API_CONTRACTS.md
 * - docs/PIPELINE.md
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { ValidationError } from "@/lib/errors.js";
import { matchByVoice } from "@/services/voiceMatch.js";
import type { VoiceMatchResponse } from "@/types/api.js";

const VoiceMatchBodySchema = z
  .object({
    s3_key: z.string().min(1),
    display_name: z.string().min(1).max(60).optional(),
    save_profile: z.boolean().default(false),
    gender: z.string().optional(),
    vocal_range: z.string().optional(),
    top_k: z.number().int().min(1).max(50).default(10),
  })
  .refine((b) => !b.save_profile || !!b.display_name?.trim(), {
    message: "display_name is required when save_profile is true",
    path: ["display_name"],
  });

export async function registerMatchRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.post<{ Reply: VoiceMatchResponse }>(
    "/matches/by-voice",
    async (req) => {
      const parsed = VoiceMatchBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues[0]?.message ?? "Invalid body",
        );
      }

      return matchByVoice(parsed.data, {
        requestId: req.id,
      });
    },
  );
}
