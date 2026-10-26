import { AwsClient } from "aws4fetch";

import { generateId } from "@/lib/db/id";
import { PDF_ALLOWED_MIME_TYPE } from "@/lib/modules/course-authoring/media";

/**
 * Cloudflare R2 adapter — AD-1's narrow out-of-process carve-out for object
 * storage, owned by Course Authoring (PDF Lessons, Story 2.6). No other module
 * talks to R2 directly.
 *
 * Server-only by use (imported only from Route Handlers / Server Actions /
 * service code — the project has no `server-only` package). Never throws at
 * module load: when the env is unset the whole feature cleanly degrades
 * (`isStorageConfigured()` is false → the routes return `503 upload_unavailable`).
 *
 * R2 speaks the S3 API: endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`,
 * region `auto`, path-style `/<bucket>/<key>`. Presigned URLs support GET / HEAD /
 * PUT / DELETE (not POST). `aws4fetch` excludes `content-type` / `content-length`
 * from the signed header set unless `allHeaders: true` — we need both signed so
 * R2 itself rejects an upload whose bytes don't match what the cap check approved.
 */

/** Every R2 call is bounded — the Stream adapter's missing timeout is a known gap. */
const R2_TIMEOUT_MS = 10_000;

function accountId(): string {
  return process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "";
}
function accessKeyId(): string {
  return process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
}
function secretAccessKey(): string {
  return process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
}
function bucket(): string {
  return process.env.R2_BUCKET?.trim() ?? "";
}

/** True only when the account id and all three R2 vars are present. */
export function isStorageConfigured(): boolean {
  return (
    accountId() !== "" &&
    accessKeyId() !== "" &&
    secretAccessKey() !== "" &&
    bucket() !== ""
  );
}

export class StorageProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageProviderError";
  }
}

function client(): AwsClient {
  return new AwsClient({
    accessKeyId: accessKeyId(),
    secretAccessKey: secretAccessKey(),
    service: "s3",
    region: "auto",
  });
}

/** Path-style object URL. `key` is server-generated (no client-controlled segments). */
function objectUrl(key: string): string {
  return `https://${accountId()}.r2.cloudflarestorage.com/${bucket()}/${key}`;
}

/**
 * Server-generated object key — never derived from the client file name (no
 * path traversal, no collisions, a replace always gets a fresh key).
 */
export function buildPdfObjectKey(input: { lessonId: string }): string {
  return `lessons/${input.lessonId}/${generateId()}.pdf`;
}

/**
 * A presigned **PUT** URL. `Content-Type` and `Content-Length` are signed, so
 * the browser must send exactly `application/pdf` and exactly the declared
 * number of bytes (R2 answers `403 SignatureDoesNotMatch` otherwise).
 */
export async function presignPdfUpload(input: {
  key: string;
  contentLength: number;
  expiresInSeconds: number;
}): Promise<string> {
  const url = new URL(objectUrl(input.key));
  url.searchParams.set("X-Amz-Expires", String(input.expiresInSeconds));

  try {
    const signed = await client().sign(url.toString(), {
      method: "PUT",
      headers: {
        "Content-Type": PDF_ALLOWED_MIME_TYPE,
        "Content-Length": String(input.contentLength),
      },
      aws: { signQuery: true, allHeaders: true },
    });
    return signed.url;
  } catch (error) {
    throw new StorageProviderError(`R2 presign failed: ${String(error)}`);
  }
}

async function call(
  key: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await client().fetch(objectUrl(key), {
      ...init,
      signal: AbortSignal.timeout(R2_TIMEOUT_MS),
    });
  } catch (error) {
    throw new StorageProviderError(`R2 request failed: ${String(error)}`);
  }
}

/** The object's real size, or `null` when it does not exist (404). */
export async function headObject(
  key: string,
): Promise<{ sizeBytes: number } | null> {
  const response = await call(key, { method: "HEAD" });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new StorageProviderError(`R2 HEAD returned ${response.status}`);
  }
  const header = response.headers.get("content-length");
  const length = header === null || header.trim() === "" ? NaN : Number(header);
  if (!Number.isFinite(length) || length < 0) {
    throw new StorageProviderError("R2 HEAD returned no usable content-length");
  }
  return { sizeBytes: length };
}

/** The first `bytes` bytes of the object (ranged GET — never the whole file). */
export async function getObjectHead(
  key: string,
  bytes: number,
): Promise<Uint8Array> {
  const response = await call(key, {
    method: "GET",
    headers: { Range: `bytes=0-${bytes - 1}` },
  });
  if (!response.ok) {
    throw new StorageProviderError(`R2 ranged GET returned ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Best-effort delete (replace / remove / rejected upload). A leaked object is a
 * storage nuisance, not a correctness bug — log and swallow. Callers `await` it
 * so a serverless invocation can't be frozen before it runs.
 */
export async function deleteObject(key: string): Promise<void> {
  if (!isStorageConfigured() || key === "") return;
  try {
    const response = await call(key, { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
      console.warn(
        `[course-authoring] R2 delete ${key} returned ${response.status}`,
      );
    }
  } catch (error) {
    console.warn(`[course-authoring] R2 delete ${key} failed`, error);
  }
}
