import { createHmac, timingSafeEqual } from "node:crypto";

import type { LessonMediaStatus } from "@/lib/modules/course-authoring/media";

/**
 * Cloudflare Stream adapter — AD-1's narrow out-of-process carve-out for video,
 * owned by Course Authoring. No other module talks to Cloudflare directly.
 *
 * Server-only by use (imported only from Route Handlers / Server Actions /
 * service code — the project has no `server-only` package; `service.ts` follows
 * the same "don't import it into a client component" convention).
 *
 * Verified API shape (web research, Sept 2026):
 *   - direct creator upload: POST /accounts/{id}/stream/direct_upload
 *       body { maxDurationSeconds (required), creator, meta, requireSignedURLs, expiry }
 *       → { result: { uploadURL, uid } }
 *   - webhook subscription: PUT /accounts/{id}/stream/webhook { notificationUrl }
 *       → { result: { secret } }
 *   - webhook body: { uid, readyToStream, status: { state, pctComplete,
 *       errorReasonCode, errorReasonText }, duration }
 *   - signature header: `Webhook-Signature: time=<unix>,sig1=<hex>`,
 *       sig1 == HMAC_SHA256(secret, "<time>.<rawBody>")
 */

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

/** How far a webhook's `time=` may skew from now before we reject it (replay). */
const WEBHOOK_TOLERANCE_SECONDS = 300;

export class StreamProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamProviderError";
  }
}

function accountId(): string {
  return process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "";
}
function apiToken(): string {
  return process.env.CLOUDFLARE_STREAM_API_TOKEN?.trim() ?? "";
}
function webhookSecret(): string {
  return process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET?.trim() ?? "";
}

/**
 * True only when all three env vars are present. When false the whole feature
 * cleanly degrades (initiation route → 503 `upload_unavailable`, webhook route →
 * 200 no-op) — the Story 1.0 pattern for un-set OAuth credentials. Never throw
 * at module load.
 */
export function isStreamConfigured(): boolean {
  return accountId() !== "" && apiToken() !== "" && webhookSecret() !== "";
}

interface CloudflareEnvelope<T> {
  success: boolean;
  result: T | null;
  errors?: Array<{ code: number; message: string }>;
}

/**
 * Mint a one-time direct-creator-upload URL. `maxDurationSeconds` reserves
 * storage against the account from now until the upload lands or `expiry`
 * passes; an over-length upload is rejected by Cloudflare (→ `error` webhook →
 * our row goes `failed`). `requireSignedURLs: true` keeps a raw video
 * un-streamable before enrollment gating exists (the signed-playback path is
 * Story 4.3 / 2.9).
 */
export async function createDirectUpload(input: {
  maxDurationSeconds: number;
  creatorId: string;
  lessonId: string;
}): Promise<{ uploadURL: string; uid: string }> {
  const expiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  let response: Response;
  try {
    response = await fetch(
      `${CLOUDFLARE_API_BASE}/accounts/${accountId()}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxDurationSeconds: input.maxDurationSeconds,
          creator: input.creatorId,
          meta: { lessonId: input.lessonId },
          requireSignedURLs: true,
          expiry,
        }),
      },
    );
  } catch (error) {
    throw new StreamProviderError(
      `Cloudflare Stream request failed: ${String(error)}`,
    );
  }

  const body = (await response
    .json()
    .catch(() => null)) as CloudflareEnvelope<{
    uploadURL: string;
    uid: string;
  }> | null;

  if (!response.ok || !body?.success || !body.result?.uploadURL) {
    const detail = body?.errors?.map((e) => e.message).join("; ") ?? response.statusText;
    throw new StreamProviderError(
      `Cloudflare Stream direct_upload failed (${response.status}): ${detail}`,
    );
  }

  return { uploadURL: body.result.uploadURL, uid: body.result.uid };
}

/**
 * Best-effort delete of a Stream asset (on replace / remove). A leaked asset is
 * a cost nuisance, not a correctness bug — log and swallow a failure.
 */
export async function deleteVideo(uid: string): Promise<void> {
  if (!isStreamConfigured() || uid === "") return;
  try {
    const response = await fetch(
      `${CLOUDFLARE_API_BASE}/accounts/${accountId()}/stream/${uid}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiToken()}` },
      },
    );
    if (!response.ok) {
      console.warn(
        `[course-authoring] Cloudflare Stream delete ${uid} returned ${response.status}`,
      );
    }
  } catch (error) {
    console.warn(
      `[course-authoring] Cloudflare Stream delete ${uid} failed`,
      error,
    );
  }
}

/**
 * Verify a `Webhook-Signature: time=<unix>,sig1=<hex>` header against the raw
 * request body. Rejects a missing/malformed header, a `time` skewed more than
 * `WEBHOOK_TOLERANCE_SECONDS`, or a signature mismatch (constant-time compare).
 * Pass the **raw** body string — do not `JSON.parse` first.
 */
export function verifyWebhookSignature(
  rawBody: string,
  header: string | null,
): boolean {
  const secret = webhookSecret();
  if (secret === "" || !header) return false;

  const parts = new Map<string, string>();
  for (const segment of header.split(",")) {
    const idx = segment.indexOf("=");
    if (idx === -1) continue;
    parts.set(segment.slice(0, idx).trim(), segment.slice(idx + 1).trim());
  }

  const time = parts.get("time");
  const sig1 = parts.get("sig1");
  if (!time || !sig1) return false;

  const timeNum = Number(time);
  if (!Number.isFinite(timeNum)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timeNum) > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${time}.${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sig1, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** The webhook notification body shape we read. */
export interface StreamWebhookPayload {
  uid?: string;
  readyToStream?: boolean;
  duration?: number;
  status?: {
    state?: string;
    pctComplete?: number | string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
}

/**
 * Pure mapper from a Cloudflare Stream webhook payload to our canonical status
 * (AD-5). `readyToStream: true` is the `ready` signal (it can fire before
 * `pctComplete` hits 100 — fine for authoring). `status.state === "error"` →
 * `failed`. Anything else in flight → `processing`. Never returns `queued`
 * (only the initiation route sets that).
 *
 * This is the "Cloudflare Stream's actual state model → AD-5's 4-state enum
 * mapping" the Architecture Spine's Deferred section left for the dev-story level.
 */
export function mapWebhookToStatus(payload: StreamWebhookPayload): {
  status: Exclude<LessonMediaStatus, "queued">;
  durationSeconds: number | null;
  errorReason: string | null;
} {
  if (payload.readyToStream === true) {
    const d = Number(payload.duration);
    return {
      status: "ready",
      durationSeconds: Number.isFinite(d) && d > 0 ? Math.round(d) : null,
      errorReason: null,
    };
  }

  if (payload.status?.state === "error") {
    return {
      status: "failed",
      durationSeconds: null,
      errorReason:
        payload.status.errorReasonText ??
        payload.status.errorReasonCode ??
        null,
    };
  }

  return { status: "processing", durationSeconds: null, errorReason: null };
}
