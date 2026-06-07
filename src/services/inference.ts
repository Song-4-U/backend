/**
 * inference-api 클라이언트.
 *
 * 책임:
 * - `POST {INFERENCE_API_URL}/embed` 호출
 * - 타임아웃 처리 -> InferenceTimeoutError
 * - embedding 길이 검증 -> InferenceShapeMismatchError
 *
 * 참고: docs/API_CONTRACTS.md - inference-api
 */

import { env } from "@/config/env.js";
import {
  InferenceShapeMismatchError,
  InferenceTimeoutError,
  UpstreamError,
} from "@/lib/errors.js";
import { logger } from "@/lib/logger.js";
import {
  EMBEDDING_DIM,
  type EmbedRequest,
  type EmbedResponse,
  type ClassifyResponse,
} from "@/types/api.js";

interface EmbedOptions {
  signal?: AbortSignal;
  requestId?: string;
}

export async function embedAudio(
  payload: EmbedRequest,
  opts: EmbedOptions = {},
): Promise<number[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    env.INFERENCE_TIMEOUT_MS,
  );

  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const res = await fetch(`${env.INFERENCE_API_URL}/embed`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.INFERENCE_API_KEY
          ? { "x-api-key": env.INFERENCE_API_KEY }
          : {}),
        ...(opts.requestId ? { "x-request-id": opts.requestId } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn(
        { status: res.status, body: text.slice(0, 500) },
        "inference-api non-2xx response",
      );
      throw new UpstreamError({
        code: "INFERENCE_UPSTREAM_ERROR",
        message: `inference-api responded with ${res.status}`,
        statusCode: 502,
      });
    }

    const data = (await res.json()) as Partial<EmbedResponse>;
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new UpstreamError({
        code: "INFERENCE_INVALID_RESPONSE",
        message: "inference-api response missing 'embedding' array",
      });
    }

    if (data.embedding.length !== EMBEDDING_DIM) {
      throw new InferenceShapeMismatchError(
        data.embedding.length,
        EMBEDDING_DIM,
      );
    }

    return data.embedding;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new InferenceTimeoutError();
    }
    if (
      err instanceof InferenceShapeMismatchError ||
      err instanceof UpstreamError
    ) {
      throw err;
    }
    logger.error({ err }, "inference-api call failed");
    throw new UpstreamError({
      code: "INFERENCE_UPSTREAM_ERROR",
      message: "Failed to reach inference-api",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function classifyAudio(
  payload: EmbedRequest,
  opts: EmbedOptions = {},
): Promise<ClassifyResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    env.INFERENCE_TIMEOUT_MS,
  );

  if (opts.signal) {
    if (opts.signal.aborted) controller.abort();
    else opts.signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const res = await fetch(`${env.INFERENCE_API_URL}/classify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(env.INFERENCE_API_KEY
          ? { "x-api-key": env.INFERENCE_API_KEY }
          : {}),
        ...(opts.requestId ? { "x-request-id": opts.requestId } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn(
        { status: res.status, body: text.slice(0, 500) },
        "inference-api non-2xx response from /classify",
      );
      throw new UpstreamError({
        code: "INFERENCE_UPSTREAM_ERROR",
        message: `inference-api responded with ${res.status} on /classify`,
        statusCode: 502,
      });
    }

    const data = (await res.json()) as Partial<ClassifyResponse>;
    if (!data.predicted_label || !data.scores) {
      throw new UpstreamError({
        code: "INFERENCE_INVALID_RESPONSE",
        message: "inference-api response missing 'predicted_label' or 'scores'",
      });
    }

    return data as ClassifyResponse;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new InferenceTimeoutError();
    }
    if (err instanceof UpstreamError) {
      throw err;
    }
    logger.error({ err }, "inference-api call failed on /classify");
    throw new UpstreamError({
      code: "INFERENCE_UPSTREAM_ERROR",
      message: "Failed to reach inference-api on /classify",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
