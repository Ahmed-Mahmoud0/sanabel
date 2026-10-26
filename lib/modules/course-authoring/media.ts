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
 * Video or PDF Lesson its shape is `{ note?: string }`, for a Text Lesson
 * (Story 2.5) `{ doc?: TextDoc }` (see `text-body.ts`).
 */

import { parseTextBody, type TextContentBody } from "./text-body";

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
 * The PRD's draft was "60 min video/Lesson, 20 hrs stored video/Instructor/month".
 * Stream pricing (confirmed on the live dashboard, 2026-10-26) is $5/1,000 min
 * stored + $1/1,000 min delivered, and storage is a purchased allowance — the
 * deployed account has 1,000 minutes. The per-Instructor cap below is sized
 * against that allowance, not the PRD draft. Adjust these the same way
 * `COURSE_CATEGORIES` is adjusted: a one-line edit, no schema change.
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
export const VIDEO_MAX_RESERVED_SECONDS_PER_INSTRUCTOR = 18_000; // 300 min (5 hours)

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
 * FR-11 PDF caps (Story 2.6).
 *
 * `[ASSUMPTION]` — the PRD only says "capped per Lesson and per Instructor";
 * no PDF number exists. R2 has no egress fees, so these bound storage only.
 * Adjust like the `VIDEO_*` caps: a one-line edit, no schema change.
 */

/** Per-Lesson cap — checked at initiation and re-checked against the real object at finalize. */
export const PDF_MAX_BYTES_PER_LESSON = 25 * 1024 * 1024; // 25 MB

/** Per-Instructor cap — a *total stored* sum of `size_bytes` over non-removed PDF media. */
export const PDF_MAX_BYTES_PER_INSTRUCTOR = 500 * 1024 * 1024; // 500 MB

/** Exactly one accepted MIME type — NFR4 "no executable or unexpected file types". */
export const PDF_ALLOWED_MIME_TYPE = "application/pdf";

/** How many leading bytes the validator inspects (the spec allows the header within the first 1024). */
export const PDF_MIME_SNIFF_BYTES = 1024;

/**
 * Presigned-PUT lifetime. Must stay below `MEDIA_QUEUED_EXPIRY_SECONDS` so a row
 * whose URL expired un-used reads as failed (`upload_expired`).
 */
export const PDF_UPLOAD_URL_EXPIRY_SECONDS = 15 * 60;

/** Failed-state `errorReason` sentinels for PDFs — the UI maps them to copy. */
export const PDF_ERROR_NOT_A_PDF = "not_a_pdf";
export const PDF_ERROR_TOO_LARGE = "too_large";
export const PDF_ERROR_MISSING = "upload_missing";

export function isPdfMime(value: unknown): value is typeof PDF_ALLOWED_MIME_TYPE {
  return value === PDF_ALLOWED_MIME_TYPE;
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/**
 * The "valid PDF" check: the ASCII bytes `%PDF-` occur within the first
 * `PDF_MIME_SNIFF_BYTES` bytes. Pure and Node-API-free so it runs anywhere.
 * Proves the file is not a renamed executable/HTML/zip — it does **not** prove
 * the PDF is well-formed or free of active content.
 */
export function looksLikePdf(head: Uint8Array): boolean {
  const limit = Math.min(head.length, PDF_MIME_SNIFF_BYTES) - PDF_MAGIC.length;
  for (let i = 0; i <= limit; i++) {
    let match = true;
    for (let j = 0; j < PDF_MAGIC.length; j++) {
      if (head[i + j] !== PDF_MAGIC[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

/** Soft cap on the PDF Lesson's optional description note. */
export const PDF_NOTE_MAX_LENGTH = VIDEO_NOTE_MAX_LENGTH;

/**
 * The content body for a Video Lesson — AD-4 field-group (b), stored in
 * `lesson.content_body` (jsonb). Stories 2.7–2.8 widen the union below with
 * their own type-specific shapes in this same column.
 */
export interface VideoContentBody {
  note?: string;
}

/** A PDF Lesson's content body (Story 2.6): the same optional note as Video. */
export interface PdfContentBody {
  note?: string;
}

export type LessonContentBody =
  | VideoContentBody
  | PdfContentBody
  | TextContentBody;

/** The note of a stored Video / PDF body ("" for any other / empty body). */
export function lessonNoteOf(body: LessonContentBody | null | undefined): string {
  if (!body || !("note" in body)) return "";
  return typeof body.note === "string" ? body.note : "";
}

/** Alias kept for the Video call sites. */
export const videoNoteOf = lessonNoteOf;
/** The description note of a stored PDF body. */
export const pdfNoteOf = lessonNoteOf;

export type ParseLessonContentBodyResult =
  | { ok: true; value: LessonContentBody }
  | { ok: false; error: "content_invalid" };

/** `{ note?: string }` — the Video caption note and the PDF description note. */
function parseNoteBody(raw: unknown): ParseLessonContentBodyResult {
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

/**
 * Trim + validate a Lesson's content body from an untrusted source, branched on
 * the Lesson Type. The single home for the field-group (b) shape rule —
 * `updateLessonContentAction` and the client editor both call this rather than
 * re-spelling the checks (same pattern as `parseCourseFields` / `parseOutlineTitle`).
 *
 * Video, Text and PDF are authored today; the other Lesson Types return
 * `content_invalid` here until Stories 2.7–2.8 add their branches.
 */
export function parseLessonContentBody(
  lessonType: string,
  raw: unknown,
): ParseLessonContentBodyResult {
  switch (lessonType) {
    case "video":
    case "pdf":
      return parseNoteBody(raw);
    case "text":
      return parseTextBody(raw);
    default:
      return { ok: false, error: "content_invalid" };
  }
}
