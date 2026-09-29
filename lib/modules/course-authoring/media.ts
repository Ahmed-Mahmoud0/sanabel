/**
 * Course Authoring — Lesson media + content-body shared constants, value types,
 * and parsing (Story 2.4).
 *
 * Import-free (no `db`, no `drizzle-orm`, no server-only code), the same rule as
 * `course.ts`: the Postgres enums in `schema.ts`, the upload-initiation Route
 * Handler, the Server Actions, and the client lesson editor all pull from here
 * without dragging server code into the client bundle.
 *
 * AD-5: the media record carries one canonical status enum
 * (`queued | processing | ready | failed`). AD-4: field-group (b) "content body"
 * is one `jsonb` column (`lesson.content_body`) with one write path — for a
 * Video Lesson its shape is `{ note?: string }`.
 */

/** One membership-guard factory instead of a hand-rolled body per enum. */
function memberOf<T extends string>(
  values: readonly T[],
): (value: unknown) => value is T {
  const set: ReadonlySet<string> = new Set(values);
  return (value): value is T => typeof value === "string" && set.has(value);
}

/**
 * The two media kinds a Lesson's media record can be. `pdf` lands now (Story
 * 2.6 builds the PDF path on this same table) for the same "avoid a mid-Epic
 * migration" reason Story 2.2 landed the full `lesson_type` enum.
 */
export const LESSON_MEDIA_KINDS = ["video", "pdf"] as const;
export type LessonMediaKind = (typeof LESSON_MEDIA_KINDS)[number];
export const isLessonMediaKind = memberOf(LESSON_MEDIA_KINDS);

/**
 * AD-5 canonical status enum. These four values are the only status a media
 * record ever holds — there is no "uploading" / "unknown" / null status. The
 * initiation Route Handler sets `queued`; the Cloudflare Stream webhook is the
 * only writer of `processing` / `ready` / `failed` for video.
 */
export const LESSON_MEDIA_STATUSES = [
  "queued",
  "processing",
  "ready",
  "failed",
] as const;
export type LessonMediaStatus = (typeof LESSON_MEDIA_STATUSES)[number];
export const isLessonMediaStatus = memberOf(LESSON_MEDIA_STATUSES);

/**
 * FR-11 upload caps.
 *
 * `[ASSUMPTION]` — every number here is a draft Ahmed still owes a decision on.
 * The PRD's draft is "60 min video/Lesson, 20 hrs stored video/Instructor/month";
 * the architecture's cost review found the addendum's Cloudflare Stream pricing
 * figures reversed (actual ≈ $1/1,000 min stored + $5/1,000 min delivered), so
 * the real cap math is unsettled — a live SPEC Open Question. Adjust these the
 * same way `COURSE_CATEGORIES` is adjusted: a one-line edit, no schema change.
 */

/**
 * Per-Lesson cap. Passed as Cloudflare's required `maxDurationSeconds` at
 * direct-upload creation, so Cloudflare itself rejects an over-length upload
 * (→ `error` webhook → our row goes `failed`). Also the amount reserved against
 * the per-Instructor total.
 */
export const VIDEO_MAX_DURATION_SECONDS_PER_LESSON = 3600; // 60 min

/**
 * Per-Instructor cap — enforced as a **total stored** sum of
 * `reserved_duration_seconds` over the Instructor's non-removed video media.
 * The PRD's "per month" wording is dropped for v1 (there is no monthly-reset
 * infrastructure); a total cap is the honest v1 shape.
 */
export const VIDEO_MAX_RESERVED_SECONDS_PER_INSTRUCTOR = 72_000; // 20 hours

/**
 * Coarse byte ceiling for the cheap client-reported pre-check, so an obviously
 * oversized file is rejected before an upload URL is minted. The real bound is
 * duration, above.
 */
export const VIDEO_MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

/** Basic direct `POST` upload caps at 200 MB; larger needs the tus protocol. */
export const CLOUDFLARE_BASIC_UPLOAD_MAX_BYTES = 200 * 1024 * 1024;

/**
 * NFR4: "no executable or unexpected file types accepted." The gate is a
 * `video/` MIME prefix (browsers derive this from the OS; a renamed `.exe`
 * never gets it); the explicit list is the known-good set for reference/tests.
 */
export const VIDEO_ALLOWED_MIME_PREFIX = "video/";
export const VIDEO_ALLOWED_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/x-msvideo",
  "video/mpeg",
  "video/ogg",
] as const;

export function isLikelyVideoMime(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(VIDEO_ALLOWED_MIME_PREFIX);
}

/**
 * How long a `queued` row may sit before it is *read* as failed. The direct
 * upload URL expires after 30 min (`stream.ts`); past that (+5 min slack) no
 * bytes can still arrive, and Cloudflare only webhooks on completion — so a
 * never-uploaded / abandoned upload would otherwise stay `queued` forever.
 * Derived on read: no non-webhook write to `status` (AD-5).
 */
export const MEDIA_QUEUED_EXPIRY_SECONDS = 35 * 60;

/** `errorReason` sentinel for an expired `queued` upload (UI maps it to copy). */
export const UPLOAD_EXPIRED_REASON = "upload_expired";

/**
 * The status the UI should show: a `queued` row older than
 * `MEDIA_QUEUED_EXPIRY_SECONDS` reads as `failed` (`upload_expired`); anything
 * else is returned unchanged.
 */
export function effectiveMediaStatus(
  status: LessonMediaStatus,
  errorReason: string | null,
  updatedAt: Date | string,
  now: number = Date.now(),
): { status: LessonMediaStatus; errorReason: string | null } {
  if (
    status === "queued" &&
    now - new Date(updatedAt).getTime() > MEDIA_QUEUED_EXPIRY_SECONDS * 1000
  ) {
    return { status: "failed", errorReason: UPLOAD_EXPIRED_REASON };
  }
  return { status, errorReason };
}

/** Soft cap on the Video Lesson's caption note (AD-4 field-group (b)). */
export const VIDEO_NOTE_MAX_LENGTH = 500;

/**
 * The content body for a Video Lesson — AD-4 field-group (b), stored in
 * `lesson.content_body` (jsonb). Stories 2.5–2.8 widen this union with their
 * own type-specific shapes in this same column.
 */
export interface VideoContentBody {
  note?: string;
}

export type LessonContentBody = VideoContentBody;

export type ParseLessonContentBodyResult =
  | { ok: true; value: LessonContentBody }
  | { ok: false; error: "content_invalid" };

/**
 * Trim + validate a Lesson's content body from an untrusted source, branched on
 * the Lesson Type. The single home for the field-group (b) shape rule —
 * `updateLessonContentAction` and the client editor both call this rather than
 * re-spelling the checks (same pattern as `parseCourseFields` / `parseOutlineTitle`).
 *
 * Story 2.4 only authors Video; the other Lesson Types return `content_invalid`
 * here until Stories 2.5–2.8 add their branches.
 */
export function parseLessonContentBody(
  lessonType: string,
  raw: unknown,
): ParseLessonContentBodyResult {
  if (lessonType !== "video") {
    return { ok: false, error: "content_invalid" };
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "content_invalid" };
  }

  const entries = Object.keys(raw as Record<string, unknown>);
  if (entries.some((key) => key !== "note")) {
    return { ok: false, error: "content_invalid" };
  }

  const rawNote = (raw as { note?: unknown }).note;
  if (rawNote === undefined) {
    return { ok: true, value: {} };
  }
  if (typeof rawNote !== "string") {
    return { ok: false, error: "content_invalid" };
  }

  const note = rawNote.trim();
  if (note.length > VIDEO_NOTE_MAX_LENGTH) {
    return { ok: false, error: "content_invalid" };
  }

  return { ok: true, value: note === "" ? {} : { note } };
}
