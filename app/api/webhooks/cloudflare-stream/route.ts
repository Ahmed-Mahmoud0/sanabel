import {
  applyWebhookStatus,
  getVideoMediaByProviderAssetId,
} from "@/lib/modules/course-authoring/service";
import {
  isStreamConfigured,
  mapWebhookToStatus,
  verifyWebhookSignature,
  type StreamWebhookPayload,
} from "@/lib/modules/course-authoring/stream";

// Node runtime: uses node:crypto (HMAC / timingSafeEqual) via the adapter.
export const runtime = "nodejs";

/**
 * Cloudflare Stream webhook — the ONLY writer of `processing` / `ready` /
 * `failed` for a video media record (AD-5: "video status is driven exclusively
 * by Cloudflare Stream webhooks"). No `revalidatePath` — the editor's own poll
 * is the client refresh path.
 */
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();

  // Local dev without Cloudflare configured: ack and no-op.
  if (!isStreamConfigured()) {
    return Response.json({ ok: true });
  }

  if (!verifyWebhookSignature(rawBody, request.headers.get("Webhook-Signature"))) {
    return new Response("bad signature", { status: 403 });
  }

  let payload: StreamWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as StreamWebhookPayload;
  } catch {
    return new Response("bad payload", { status: 400 });
  }

  const uid = payload.uid;
  if (typeof uid !== "string" || uid === "") {
    return Response.json({ ok: true });
  }

  const media = await getVideoMediaByProviderAssetId(uid);
  if (!media) {
    // Not one of ours (or already removed) — ack so Cloudflare stops retrying.
    return Response.json({ ok: true });
  }

  const { status, durationSeconds, errorReason } = mapWebhookToStatus(payload);
  await applyWebhookStatus({
    providerAssetId: uid,
    status,
    durationSeconds,
    errorReason,
  });

  return Response.json({ ok: true });
}
