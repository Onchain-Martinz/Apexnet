import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// ── R2 client ────────────────────────────────────────────────────────────────
// Cloudflare R2 exposes an S3-compatible API under:
//   https://<ACCOUNT_ID>.r2.cloudflarestorage.com
// Configure the bucket to be PRIVATE. PDFs are delivered only through the
// authenticated /api/books/[id]/file endpoint, which streams from R2 after
// verifying the caller's access rights.

function getClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.",
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not configured");
  return bucket;
}

// ── Upload ────────────────────────────────────────────────────────────────────
// Stores `data` under `<prefix>/<uuid>.pdf` in the configured bucket.
// Returns the object key — this is what gets persisted in Textbook.fileKey.

function extFor(contentType: string): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "pdf";
}

export async function uploadToR2(
  data: Uint8Array,
  contentType: string,
  prefix = "textbooks",
): Promise<string> {
  const key = `${prefix}/${randomUUID()}.${extFor(contentType)}`;
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: data,
      ContentType: contentType,
    }),
  );
  return key;
}

// ── Stream download ───────────────────────────────────────────────────────────
// Returns a WHATWG ReadableStream and optional metadata for the object.
// Throws if the object does not exist or R2 returns an error — the caller
// must handle this (return 404 or 502 as appropriate).

export interface R2ObjectStream {
  stream: ReadableStream;
  contentLength: number | undefined;
  contentType: string | undefined;
}

export async function streamFromR2(key: string): Promise<R2ObjectStream> {
  const response = await getClient().send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
  );

  if (!response.Body) {
    throw new Error(`R2 object "${key}" returned an empty body`);
  }

  return {
    stream: response.Body.transformToWebStream(),
    contentLength: response.ContentLength,
    contentType: response.ContentType,
  };
}

// ── Delete ────────────────────────────────────────────────────────────────────
// Removes an object from R2. Safe to call with a key that no longer exists
// (R2 / S3 DELETE is idempotent — it succeeds even if the object is gone).

export async function deleteFromR2(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key }),
  );
}
