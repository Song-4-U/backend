/**
 * S3 presigned URL 발급 서비스.
 *
 * 책임:
 * - 업로드용 PUT presigned URL 발급 (`createUploadPresignedUrl`)
 * - 추론용 GET presigned URL 발급 (`createDownloadPresignedUrl`)
 *
 * 키 컨벤션:
 * - uploads/YYYY/MM/DD/<uuid>.<ext>
 */

import { randomUUID } from "node:crypto";

import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/config/env.js";
import { ValidationError } from "@/lib/errors.js";

/** 허용 오디오 MIME 타입. 백엔드 합의 항목이며 추후 확장 가능. */
export const ALLOWED_AUDIO_CONTENT_TYPES = new Set<string>([
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/aac",
]);

function extFromContentType(contentType: string): string {
  if (contentType.includes("webm")) return "webm";
  if (contentType.includes("ogg")) return "ogg";
  if (contentType.includes("mpeg")) return "mp3";
  if (contentType.includes("wav")) return "wav";
  if (contentType.includes("mp4")) return "m4a";
  if (contentType.includes("aac")) return "aac";
  return "bin";
}

function buildUploadKey(contentType: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  return `uploads/${yyyy}/${mm}/${dd}/${randomUUID()}.${extFromContentType(contentType)}`;
}

let _client: S3Client | null = null;

function s3(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: env.AWS_REGION,
    ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });
  return _client;
}

export interface UploadPresignedUrl {
  upload_url: string;
  s3_key: string;
  expires_in: number;
}

export async function createUploadPresignedUrl(
  contentType: string,
): Promise<UploadPresignedUrl> {
  if (!ALLOWED_AUDIO_CONTENT_TYPES.has(contentType)) {
    throw new ValidationError(
      `Unsupported content_type: ${contentType}. Allowed: ${[
        ...ALLOWED_AUDIO_CONTENT_TYPES,
      ].join(", ")}`,
    );
  }

  const key = buildUploadKey(contentType);
  const cmd = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3(), cmd, {
    expiresIn: env.S3_PRESIGN_EXPIRES_IN,
  });

  return {
    upload_url: url,
    s3_key: key,
    expires_in: env.S3_PRESIGN_EXPIRES_IN,
  };
}

/**
 * 추론 서버에 전달할 GET presigned URL.
 *
 * inference-api 가 (bucket, key) 직접 접근 권한이 없을 때 사용.
 */
export async function createDownloadPresignedUrl(
  s3Key: string,
  expiresInSec = env.S3_PRESIGN_EXPIRES_IN,
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: s3Key,
  });
  return getSignedUrl(s3(), cmd, { expiresIn: expiresInSec });
}
