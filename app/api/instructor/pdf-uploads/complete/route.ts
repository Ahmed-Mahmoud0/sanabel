import { hasRole, getSessionUser, isOwner } from "@/lib/auth/authorization";
import {
  looksLikePdf,
  PDF_ERROR_MISSING,
  PDF_ERROR_NOT_A_PDF,
  PDF_ERROR_TOO_LARGE,
  PDF_MAX_BYTES_PER_LESSON,
  PDF_MIME_SNIFF_BYTES,
  effectiveMediaStatus,
  type LessonMediaStatus,
} from "@/lib/modules/course-authoring/media";
import {
  finalizePdfMedia,
  getLessonEditorData,
} from "@/lib/modules/course-authoring/service";
import {
  deleteObject,
  getObjectHead,
  headObject,
  isStorageConfigured,
  StorageProviderError,
} from "@/lib/modules/course-authoring/storage";

export const runtime = "nodejs";

/**
 * PDF finalize — the synchronous server-side validator (AD-5: "PDF status is
 * set synchronously after server-side type/size validation") and the only
 * writer of `ready` / `failed` for a PDF. The bytes were PUT straight to R2 via
 * the presigned URL from `pdf-uploads`; this is a *completion* step, not a
 * second initiation point: caps are enforced only at initiation and merely
 * re-verified here against the real object, because the declared size was
 * client-reported.
 */

type Fail = { ok: false; error: { code: string; message: string } };

function fail(code: string, message: string, status: number): Response {
  return Response.json({ ok: false, error: { code, message } } satisfies Fail, {
    status,
  });
}

function state(
  status: LessonMediaStatus,
  errorReason: string | null,
  hasPrevious: boolean,
): Response {
  return Response.json({ ok: true, data: { status, errorReason, hasPrevious } });
}

export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) return fail("forbidden", "not signed in", 401);
  if (!hasRole(user, "instructor")) {
    return fail("forbidden", "requires instructor role", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("bad_request", "invalid JSON body", 400);
  }
  const lessonId = (body as { lessonId?: unknown } | null)?.lessonId;
  if (typeof lessonId !== "string" || lessonId === "") {
    return fail("bad_request", "malformed request", 400);
  }

  const data = await getLessonEditorData(lessonId);
  if (!data) return fail("not_found", "lesson not found", 404);
  if (!isOwner(user, data.instructorId)) {
    return fail("forbidden", "not the course owner", 403);
  }

  const media = data.media;
  if (!media || media.kind !== "pdf" || !media.providerAssetId) {
    return fail("not_found", "no PDF upload for this lesson", 404);
  }

  // Idempotent: only a `queued` row is finalized; anything else just reports.
  if (media.status !== "queued") {
    return state(media.status, media.errorReason, media.previousPdf !== null);
  }
  // An abandoned `queued` row past the URL expiry reads as failed (no write).
  const effective = effectiveMediaStatus(
    media.status,
    media.errorReason,
    media.updatedAt,
  );
  if (effective.status !== "queued") {
    return state(
      effective.status,
      effective.errorReason,
      media.previousPdf !== null,
    );
  }

  if (!isStorageConfigured()) {
    return fail("upload_unavailable", "PDF upload is not configured", 503);
  }

  const key = media.providerAssetId;
  let outcome:
    | { status: "ready"; sizeBytes: number }
    | { status: "failed"; errorReason: string };

  try {
    const head = await headObject(key);
    if (!head) {
      outcome = { status: "failed", errorReason: PDF_ERROR_MISSING };
    } else if (
      head.sizeBytes > PDF_MAX_BYTES_PER_LESSON ||
      head.sizeBytes > (media.sizeBytes ?? 0)
    ) {
      // Over the cap, or not the size the cap check approved at initiation.
      await deleteObject(key);
      outcome = { status: "failed", errorReason: PDF_ERROR_TOO_LARGE };
    } else if (!looksLikePdf(await getObjectHead(key, PDF_MIME_SNIFF_BYTES))) {
      // Never leave a rejected file in the bucket.
      await deleteObject(key);
      outcome = { status: "failed", errorReason: PDF_ERROR_NOT_A_PDF };
    } else {
      outcome = { status: "ready", sizeBytes: head.sizeBytes };
    }
  } catch (error) {
    if (error instanceof StorageProviderError) {
      // Transient provider trouble is not a validation failure: leave the row
      // `queued` so Retry can re-run.
      console.error("[course-authoring] pdf finalize provider error", error);
      return fail("provider_error", "storage provider error", 502);
    }
    throw error;
  }

  const updated = await finalizePdfMedia({
    lessonId,
    objectKey: key,
    outcome,
  });
  if (updated) {
    // The new PDF validated: the kept previous one is no longer needed.
    if (updated.status === "ready" && media.previousPdf) {
      await deleteObject(media.previousPdf.objectKey);
    }
    return state(
      updated.status,
      updated.errorReason,
      updated.previousPdf !== null,
    );
  }

  // Lost a race (replace / remove / double submit): report what is there now.
  const fresh = await getLessonEditorData(lessonId);
  if (!fresh?.media || fresh.media.kind !== "pdf") {
    return fail("not_found", "no PDF upload for this lesson", 404);
  }
  return state(
    fresh.media.status,
    fresh.media.errorReason,
    fresh.media.previousPdf !== null,
  );
}
