import { hasRole, getSessionUser, isOwner } from "@/lib/auth/authorization";
import {
  effectiveMediaStatus,
  isPdfMime,
  PDF_MAX_BYTES_PER_INSTRUCTOR,
  PDF_MAX_BYTES_PER_LESSON,
  PDF_UPLOAD_URL_EXPIRY_SECONDS,
} from "@/lib/modules/course-authoring/media";
import {
  getLessonEditorData,
  MediaConflictError,
  setLessonType,
  sumInstructorPdfBytes,
  upsertPdfMediaForUpload,
} from "@/lib/modules/course-authoring/service";
import {
  buildPdfObjectKey,
  deleteObject,
  isStorageConfigured,
  presignPdfUpload,
  StorageProviderError,
} from "@/lib/modules/course-authoring/storage";

export const runtime = "nodejs";

/**
 * The ONE upload-initiation Route Handler for PDF (AD-5). FR-11 caps are
 * enforced here, once, server-side — never in a Server Action, never in the
 * client. It returns a short-lived presigned R2 `PUT` URL: the bytes go
 * browser → R2 directly (Vercel Functions reject request bodies over 4.5 MB, so
 * a PDF cannot be posted through a Sanabel route). The media row starts at
 * `queued`; only `pdf-uploads/complete` moves it to `ready` / `failed`, after
 * validating the real object server-side.
 */

type Fail = { ok: false; error: { code: string; message: string } };

function fail(code: string, message: string, status: number): Response {
  return Response.json({ ok: false, error: { code, message } } satisfies Fail, {
    status,
  });
}

/** Display-only: drop path separators / control characters, cap at 255 chars. */
const DEFAULT_FILE_NAME = "document.pdf";

function cleanFileName(raw: string): string {
  const cleaned = raw
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
    // Zero-width and bidi override/isolate characters can spoof the extension.
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
    .trim();
  // Array.from keeps surrogate pairs whole when capping at 255 characters.
  const capped = Array.from(cleaned).slice(0, 255).join("");
  return capped === "" ? DEFAULT_FILE_NAME : capped;
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

  const { lessonId, fileName, fileType, fileSizeBytes } = (body ?? {}) as {
    lessonId?: unknown;
    fileName?: unknown;
    fileType?: unknown;
    fileSizeBytes?: unknown;
  };

  if (
    typeof lessonId !== "string" ||
    lessonId === "" ||
    typeof fileName !== "string" ||
    typeof fileType !== "string" ||
    typeof fileSizeBytes !== "number" ||
    !Number.isInteger(fileSizeBytes) ||
    fileSizeBytes <= 0
  ) {
    return fail("bad_request", "malformed upload request", 400);
  }

  const data = await getLessonEditorData(lessonId);
  if (!data) return fail("not_found", "lesson not found", 404);
  if (!isOwner(user, data.instructorId)) {
    return fail("forbidden", "not the course owner", 403);
  }
  if (data.lesson.lessonType !== null && data.lesson.lessonType !== "pdf") {
    return fail("wrong_lesson_type", "lesson is not a PDF lesson", 409);
  }

  // --- FR-11 caps + type (AC #2), before anything is written or minted ---
  if (!isPdfMime(fileType)) {
    return fail("bad_file_type", "not a PDF file", 415);
  }
  if (fileSizeBytes > PDF_MAX_BYTES_PER_LESSON) {
    return fail("file_too_large", "file exceeds the size limit", 413);
  }

  const used = await sumInstructorPdfBytes(data.instructorId);
  // A new attempt supersedes the row's own in-flight (`queued`) upload, whose
  // declared bytes are counted — don't double-count those. A `ready` file stays
  // on disk as the kept previous PDF until the new one validates, so it still
  // counts; `failed` / expired rows are not counted at all.
  const media = data.media;
  const supersededBytes =
    media &&
    media.kind === "pdf" &&
    effectiveMediaStatus(media.status, media.errorReason, media.updatedAt)
      .status === "queued"
      ? (media.sizeBytes ?? 0)
      : 0;
  if (used - supersededBytes + fileSizeBytes > PDF_MAX_BYTES_PER_INSTRUCTOR) {
    return fail(
      "instructor_cap_reached",
      "instructor PDF storage limit reached",
      413,
    );
  }

  if (!isStorageConfigured()) {
    return fail("upload_unavailable", "PDF upload is not configured", 503);
  }

  // Choosing PDF by starting an upload. Only sets when unset. If the guarded
  // write lost a race, re-read: proceed only if it is now PDF.
  if (data.lesson.lessonType === null) {
    const typed = await setLessonType({ lessonId, lessonType: "pdf" });
    if (!typed) {
      const fresh = await getLessonEditorData(lessonId);
      if (!fresh) return fail("not_found", "lesson not found", 404);
      if (fresh.lesson.lessonType !== "pdf") {
        return fail("wrong_lesson_type", "lesson is not a PDF lesson", 409);
      }
    }
  }

  const key = buildPdfObjectKey({ lessonId });
  let uploadURL: string;
  try {
    uploadURL = await presignPdfUpload({
      key,
      contentLength: fileSizeBytes,
      expiresInSeconds: PDF_UPLOAD_URL_EXPIRY_SECONDS,
    });
  } catch (error) {
    if (error instanceof StorageProviderError) {
      console.error("[course-authoring] presignPdfUpload failed", error);
      return fail("provider_error", "storage provider error", 502);
    }
    throw error;
  }

  let result: Awaited<ReturnType<typeof upsertPdfMediaForUpload>>;
  try {
    result = await upsertPdfMediaForUpload({
      lessonId,
      objectKey: key,
      fileName: cleanFileName(fileName),
      sizeBytes: fileSizeBytes,
    });
  } catch (error) {
    if (error instanceof MediaConflictError) {
      // Nothing has been uploaded to R2 yet, so there is nothing to release.
      return fail("upload_in_progress", "another upload is already starting", 409);
    }
    throw error;
  }
  // Only a superseded unfinished/failed attempt is deleted here; a `ready`
  // file is kept (as `previous_pdf`) until the new upload validates. Awaited so
  // serverless can't freeze the invocation before the delete runs.
  for (const key of result.staleObjectKeys) await deleteObject(key);

  return Response.json({
    ok: true,
    data: { uploadURL, status: "queued" },
  });
}
