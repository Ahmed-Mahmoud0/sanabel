import { hasRole, getSessionUser, isOwner } from "@/lib/auth/authorization";
import {
  isLikelyVideoMime,
  VIDEO_MAX_DURATION_SECONDS_PER_LESSON,
  VIDEO_MAX_RESERVED_SECONDS_PER_INSTRUCTOR,
  VIDEO_MAX_UPLOAD_BYTES,
} from "@/lib/modules/course-authoring/media";
import {
  getLessonEditorData,
  MediaConflictError,
  setLessonType,
  sumInstructorReservedVideoSeconds,
  upsertVideoMediaForUpload,
} from "@/lib/modules/course-authoring/service";
import {
  createDirectUpload,
  deleteVideo,
  isStreamConfigured,
  StreamProviderError,
} from "@/lib/modules/course-authoring/stream";

// Node runtime: consistent with the webhook handler, and the Cloudflare fetch
// is simplest there. POST Route Handlers are not cached (Next 16 default).
export const runtime = "nodejs";

/**
 * The ONE upload-initiation Route Handler for video (AD-5). FR-11 caps are
 * enforced here, once, server-side — never in a Server Action, never in the
 * client. Returns a one-time Cloudflare Stream direct-creator-upload URL; the
 * client then uploads the file bytes straight to Cloudflare (zero egress
 * through Sanabel). The media row starts at `queued`; only the Stream webhook
 * moves it to `processing` / `ready` / `failed`.
 */

type Fail = { ok: false; error: { code: string; message: string } };

function fail(code: string, message: string, status: number): Response {
  return Response.json({ ok: false, error: { code, message } } satisfies Fail, {
    status,
  });
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
    !Number.isFinite(fileSizeBytes) ||
    fileSizeBytes <= 0
  ) {
    return fail("bad_request", "malformed upload request", 400);
  }

  const data = await getLessonEditorData(lessonId);
  if (!data) return fail("not_found", "lesson not found", 404);
  if (!isOwner(user, data.instructorId)) {
    return fail("forbidden", "not the course owner", 403);
  }
  if (data.lesson.lessonType !== null && data.lesson.lessonType !== "video") {
    return fail("wrong_lesson_type", "lesson is not a video lesson", 409);
  }

  // --- FR-11 caps (AC #2), before any Cloudflare call ---
  if (!isLikelyVideoMime(fileType)) {
    return fail("bad_file_type", "not a video file", 415);
  }
  if (fileSizeBytes > VIDEO_MAX_UPLOAD_BYTES) {
    return fail("file_too_large", "file exceeds the size limit", 413);
  }

  const used = await sumInstructorReservedVideoSeconds(data.instructorId);
  // A replace re-uses the existing reservation — don't double-count it.
  const alreadyReserved =
    data.media && data.media.kind === "video"
      ? data.media.reservedDurationSeconds
      : 0;
  if (
    used - alreadyReserved + VIDEO_MAX_DURATION_SECONDS_PER_LESSON >
    VIDEO_MAX_RESERVED_SECONDS_PER_INSTRUCTOR
  ) {
    return fail(
      "instructor_cap_reached",
      "instructor video storage limit reached",
      413,
    );
  }

  if (!isStreamConfigured()) {
    return fail("upload_unavailable", "video upload is not configured", 503);
  }

  // Choosing Video by starting a video upload (AC #5). Only sets when unset. If
  // the guarded write lost a race, re-read: proceed only if it is now Video.
  if (data.lesson.lessonType === null) {
    const typed = await setLessonType({ lessonId, lessonType: "video" });
    if (!typed) {
      const fresh = await getLessonEditorData(lessonId);
      if (!fresh) return fail("not_found", "lesson not found", 404);
      if (fresh.lesson.lessonType !== "video") {
        return fail("wrong_lesson_type", "lesson is not a video lesson", 409);
      }
    }
  }

  let upload: { uploadURL: string; uid: string };
  try {
    upload = await createDirectUpload({
      maxDurationSeconds: VIDEO_MAX_DURATION_SECONDS_PER_LESSON,
      creatorId: data.instructorId,
      lessonId,
    });
  } catch (error) {
    if (error instanceof StreamProviderError) {
      console.error("[course-authoring] createDirectUpload failed", error);
      return fail("provider_error", "video provider error", 502);
    }
    throw error;
  }

  let result: Awaited<ReturnType<typeof upsertVideoMediaForUpload>>;
  try {
    result = await upsertVideoMediaForUpload({
      lessonId,
      providerAssetId: upload.uid,
      sizeBytes: fileSizeBytes,
      reservedDurationSeconds: VIDEO_MAX_DURATION_SECONDS_PER_LESSON,
    });
  } catch (error) {
    if (error instanceof MediaConflictError) {
      // A concurrent initiation for this lesson won — release the upload we
      // just minted so its reservation doesn't leak.
      await deleteVideo(upload.uid);
      return fail("upload_in_progress", "another upload is already starting", 409);
    }
    throw error;
  }
  // `deleteVideo` never throws; await it so serverless can't freeze the
  // invocation before the orphaned Stream asset is actually deleted.
  if (result.previousAssetId) await deleteVideo(result.previousAssetId);
  const { media } = result;

  return Response.json({
    ok: true,
    data: { uploadURL: upload.uploadURL, mediaId: media.id, status: "queued" },
  });
}
