/**
 * 도메인 에러 클래스 및 표준 에러 응답 shape.
 *
 * 응답 shape (frontend/docs/API_CONTRACTS.md 참고):
 * {
 *   "error": {
 *     "code": "EMBEDDING_TIMEOUT",
 *     "message": "...",
 *     "request_id": "req_..."
 *   }
 * }
 */

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(opts: { statusCode: number; code: string; message: string }) {
    super(opts.message);
    this.name = "ApiError";
    this.statusCode = opts.statusCode;
    this.code = opts.code;
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super({ statusCode: 400, code: "VALIDATION_ERROR", message });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super({ statusCode: 404, code: "NOT_FOUND", message });
    this.name = "NotFoundError";
  }
}

export class InferenceTimeoutError extends ApiError {
  constructor(message = "Inference request timed out") {
    super({ statusCode: 504, code: "EMBEDDING_TIMEOUT", message });
    this.name = "InferenceTimeoutError";
  }
}

export class InferenceShapeMismatchError extends ApiError {
  constructor(actual: number, expected: number) {
    super({
      statusCode: 422,
      code: "EMBEDDING_SHAPE_MISMATCH",
      message: `Embedding shape mismatch: got ${actual}, expected ${expected}`,
    });
    this.name = "InferenceShapeMismatchError";
  }
}

export class UpstreamError extends ApiError {
  constructor(opts: { code: string; message: string; statusCode?: number }) {
    super({
      statusCode: opts.statusCode ?? 502,
      code: opts.code,
      message: opts.message,
    });
    this.name = "UpstreamError";
  }
}

/** API 외부로 노출되는 에러 응답 body. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    request_id?: string;
  };
}

export function toApiErrorBody(
  err: ApiError,
  requestId?: string,
): ApiErrorBody {
  return {
    error: {
      code: err.code,
      message: err.message,
      ...(requestId ? { request_id: requestId } : {}),
    },
  };
}
