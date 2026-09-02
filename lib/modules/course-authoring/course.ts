/**
 * Course Authoring — shared, import-free constants, value types, and field
 * parsing (Story 2.1).
 *
 * Deliberately dependency-free (no `db`, no `drizzle-orm`, no server-only code)
 * so the same code feeds every consumer without dragging server code into the
 * client bundle: the Postgres enums in `schema.ts`, the server-side validation
 * in `actions.ts`, and the client creation form (option lists + pre-submit
 * validation). Same pattern as `lib/modules/accounts/profile.ts`
 * (`BIO_MAX_LENGTH`). Keep it import-free.
 */

/**
 * Course category taxonomy — a bounded, DB-enforced set from day one rather
 * than free text (a free-text field would fragment into inconsistent
 * Instructor-invented values and undermine Epic 3's "filterable by Category",
 * FR-17).
 *
 * `[ASSUMPTION]` This is a draft starter set — no FR, epic, or architecture
 * document enumerates Sanabel's real categories, so Ahmed should adjust to
 * taste. Cheap to change later via a follow-up enum migration; not a blocking
 * decision now. The stable slug below is the canonical stored value — human
 * labels live only in the i18n catalog (`Course.categories.*`), never in the
 * DB, the same rule AD-9 applies to every other user-facing string.
 */
export const COURSE_CATEGORIES = [
  "programming-fundamentals",
  "web-development",
  "data-science",
  "mobile-development",
  "devops-cloud",
  "computer-science",
  "other",
] as const;

export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

/**
 * Course content language (AD-9). Set once by the Instructor at creation and
 * never auto-translated — there is no separate language step later. This shares
 * the same two values as the UI locale (Story 1.6) by coincidence only: it has
 * nothing to do with which language the browsing visitor's UI chrome is in, and
 * must never be defaulted off the active UI locale.
 */
export const COURSE_CONTENT_LANGUAGES = ["en", "ar"] as const;

export type CourseContentLanguage = (typeof COURSE_CONTENT_LANGUAGES)[number];

/**
 * Soft length caps on the two free-text creation fields. Nothing in the epics
 * or architecture pins a number — judgment calls in the spirit of Story 1.5's
 * `BIO_MAX_LENGTH`, enforced both client-side (`maxLength` + `parseCourseFields`)
 * and server-side (`parseCourseFields` in `actions.ts`). `title` mirrors the 120
 * the display-name field already uses; `description` is shorter because AC #1
 * calls it a "one-line description".
 */
export const COURSE_TITLE_MAX_LENGTH = 120;
export const COURSE_DESCRIPTION_MAX_LENGTH = 200;

/** One membership-guard factory instead of a hand-rolled body per enum. */
function memberOf<T extends string>(
  values: readonly T[],
): (value: unknown) => value is T {
  const set: ReadonlySet<string> = new Set(values);
  return (value): value is T => typeof value === "string" && set.has(value);
}

export const isCourseCategory = memberOf(COURSE_CATEGORIES);
export const isCourseContentLanguage = memberOf(COURSE_CONTENT_LANGUAGES);

/**
 * Stable error codes for the four creation fields. The Server Action returns
 * one of these as `error.code`; the client form maps the same set to localized
 * strings — so both sides agree on what "valid" means.
 */
export type CourseFieldError =
  | "title_required"
  | "title_too_long"
  | "description_required"
  | "description_too_long"
  | "category_invalid"
  | "content_language_invalid";

export interface CourseFieldValues {
  title: string;
  description: string;
  category: CourseCategory;
  contentLanguage: CourseContentLanguage;
}

export type ParseCourseFieldsResult =
  | { ok: true; value: CourseFieldValues }
  | { ok: false; error: CourseFieldError };

/**
 * Trim + validate the four creation fields from an untrusted source (the raw
 * Server Action input, or the client form's state). The single home for the
 * creation rules — `actions.ts` and `create-course-form.tsx` both call this
 * rather than each spelling the checks out inline.
 */
export function parseCourseFields(raw: {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  contentLanguage?: unknown;
}): ParseCourseFieldsResult {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";

  if (title === "") return { ok: false, error: "title_required" };
  if (title.length > COURSE_TITLE_MAX_LENGTH) {
    return { ok: false, error: "title_too_long" };
  }
  if (description === "") return { ok: false, error: "description_required" };
  if (description.length > COURSE_DESCRIPTION_MAX_LENGTH) {
    return { ok: false, error: "description_too_long" };
  }
  if (!isCourseCategory(raw.category)) {
    return { ok: false, error: "category_invalid" };
  }
  if (!isCourseContentLanguage(raw.contentLanguage)) {
    return { ok: false, error: "content_language_invalid" };
  }

  return {
    ok: true,
    value: {
      title,
      description,
      category: raw.category,
      contentLanguage: raw.contentLanguage,
    },
  };
}
