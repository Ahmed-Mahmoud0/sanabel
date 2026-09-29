"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import type { ActionResult } from "@/lib/actions/result";
import {
  AuthorizationError,
  isOwner,
  requireRole,
  type SessionUser,
} from "@/lib/auth/authorization";
import {
  isLessonType,
  LESSON_TITLE_MAX_LENGTH,
  MODULE_TITLE_MAX_LENGTH,
  parseCourseFields,
  parseOutlineTitle,
  type LessonType,
} from "@/lib/modules/course-authoring/course";
import {
  parseLessonContentBody,
  type LessonMediaStatus,
} from "@/lib/modules/course-authoring/media";
import {
  addLesson,
  addModule,
  createCourse,
  getCourseById,
  getLessonCourseContext,
  getLessonEditorData,
  getLessonMediaStatus,
  getModuleCourseContext,
  removeVideoMedia,
  reorderLessons,
  reorderModules,
  setLessonRequired,
  setLessonType,
  updateLessonContent,
  updateLessonTitle,
  updateModuleTitle,
  type OutlineLesson,
  type OutlineModule,
} from "@/lib/modules/course-authoring/service";
import { deleteVideo } from "@/lib/modules/course-authoring/stream";

/**
 * Course Authoring Server Actions (AD-1). Same seam Story 1.4 first reconciled:
 * pages/layouts guard with `can()` / `notFound()`; Server Actions guard with
 * `requireRole()` (which throws) but must never throw across the client
 * boundary — so the whole body runs in try/catch and every failure, auth
 * included, becomes `{ ok: false, error }` (see `@/lib/actions/result`).
 */

export interface CreateCourseActionInput {
  title: string;
  description: string;
  category: string;
  contentLanguage: string;
}

/**
 * Create a Course from the four creation fields (AC #1, #2). Instructor only
 * (AC #3 — the role gate, on top of the route-group layout guard). Re-validates
 * every field server-side via the shared `parseCourseFields` regardless of what
 * the client sent, then returns the new course id; it does **not** `redirect()`
 * — the client navigates to the course landing page on `ok`.
 */
export async function createCourseAction(
  input: CreateCourseActionInput,
): Promise<ActionResult<{ courseId: string }>> {
  try {
    const user = await requireRole("instructor");

    const parsed = parseCourseFields(input);
    if (!parsed.ok) {
      return {
        ok: false,
        error: { code: parsed.error, message: `invalid course field: ${parsed.error}` },
      };
    }

    const created = await createCourse({
      instructorId: user.id,
      ...parsed.value,
    });

    // Refresh "My Courses" so the new (unpublished) course shows on next view.
    // Path is the route pattern (dynamic `[locale]` + `type: "page"`); route
    // groups like `(instructor)` are not part of it.
    revalidatePath("/[locale]/courses", "page");

    return { ok: true, data: { courseId: created.id } };
  } catch (error) {
    // Never swallow Next.js control-flow signals (redirect/notFound/etc.).
    unstable_rethrow(error);

    if (error instanceof AuthorizationError) {
      return {
        ok: false,
        error: { code: "forbidden", message: "caller lacks instructor role" },
      };
    }

    console.error("[course-authoring] createCourseAction failed", error);
    return {
      ok: false,
      error: { code: "unknown", message: "unexpected error in createCourseAction" },
    };
  }
}

// ---------------------------------------------------------------------------
// Outline editor: Module + Lesson (Story 2.2)
// ---------------------------------------------------------------------------

/**
 * Shared guard for every Module/Lesson mutation below: `requireRole("instructor")`
 * (throws `AuthorizationError`, absorbed by each action's catch), then the AD-6
 * `isOwner()` resource check against the owning Course's Instructor — never an
 * inline `=== user.id`. `{ code: "not_found" }` when `resolve` yields nothing
 * (row gone or soft-removed); `{ code: "forbidden" }` when it belongs to another
 * Instructor. `resolve` returns the owning Course's `instructorId` for whatever
 * the action targets (a Course, a Module, or a Lesson).
 */
type OwnerCheck =
  | { ok: true; user: SessionUser }
  | { ok: false; error: { code: string; message: string } };

async function requireOwner(
  resolve: () => Promise<{ instructorId: string } | null>,
  kind: string,
): Promise<OwnerCheck> {
  const user = await requireRole("instructor");
  const ctx = await resolve();
  if (!ctx) {
    return { ok: false, error: { code: "not_found", message: `${kind} not found` } };
  }
  if (!isOwner(user, ctx.instructorId)) {
    return { ok: false, error: { code: "forbidden", message: "not course owner" } };
  }
  return { ok: true, user };
}

/** Map a thrown error to the standard action failure (auth vs. unknown). */
function toErrorResult(error: unknown, where: string): ActionResult<never> {
  unstable_rethrow(error);
  if (error instanceof AuthorizationError) {
    return { ok: false, error: { code: "forbidden", message: "caller lacks instructor role" } };
  }
  console.error(`[course-authoring] ${where} failed`, error);
  return { ok: false, error: { code: "unknown", message: `unexpected error in ${where}` } };
}

/**
 * Append a Module to a Course (AC #1). Instructor + owner only. The client
 * always sends a non-empty title (a localized "Untitled module" default), so an
 * empty title is a real validation failure, not an expected "blank add".
 */
export async function addModuleAction(
  courseId: string,
  title: string,
): Promise<ActionResult<{ module: OutlineModule }>> {
  try {
    const auth = await requireOwner(async () => {
      const c = await getCourseById(courseId);
      return c ? { instructorId: c.instructorId } : null;
    }, "course");
    if (!auth.ok) return { ok: false, error: auth.error };

    const parsed = parseOutlineTitle(title, MODULE_TITLE_MAX_LENGTH);
    if (!parsed.ok) {
      return { ok: false, error: { code: parsed.error, message: `invalid module title` } };
    }

    const created = await addModule({ courseId, title: parsed.value });

    return {
      ok: true,
      data: {
        module: {
          id: created.id,
          title: created.title,
          position: created.position,
          lessons: [],
        },
      },
    };
  } catch (error) {
    return toErrorResult(error, "addModuleAction");
  }
}

/**
 * Append a Lesson to a Module (AC #2). Title-only — no type/content yet.
 * Returns fast and never redirects, so the Instructor can immediately add
 * another Lesson.
 */
export async function addLessonAction(
  moduleId: string,
  title: string,
): Promise<ActionResult<{ lesson: OutlineLesson }>> {
  try {
    const auth = await requireOwner(
      () => getModuleCourseContext(moduleId),
      "module",
    );
    if (!auth.ok) return { ok: false, error: auth.error };

    const parsed = parseOutlineTitle(title, LESSON_TITLE_MAX_LENGTH);
    if (!parsed.ok) {
      return { ok: false, error: { code: parsed.error, message: `invalid lesson title` } };
    }

    const created = await addLesson({ moduleId, title: parsed.value });

    return {
      ok: true,
      data: {
        lesson: {
          id: created.id,
          title: created.title,
          lessonType: created.lessonType,
          required: created.required,
          position: created.position,
          media: null,
        },
      },
    };
  } catch (error) {
    return toErrorResult(error, "addLessonAction");
  }
}

/**
 * Debounced autosave for a Module title (AC #3). No payload — the client only
 * needs success/failure. No `revalidatePath` — that would thrash the RSC
 * payload on every pause. (Same-field concurrent-edit reconciliation is
 * `[DEFERRED]` per AD-4: v1 has no multi-Instructor co-authoring.)
 */
export async function renameModuleAction(
  moduleId: string,
  title: string,
): Promise<ActionResult<null>> {
  try {
    const auth = await requireOwner(
      () => getModuleCourseContext(moduleId),
      "module",
    );
    if (!auth.ok) return { ok: false, error: auth.error };

    const parsed = parseOutlineTitle(title, MODULE_TITLE_MAX_LENGTH);
    if (!parsed.ok) {
      return { ok: false, error: { code: parsed.error, message: `invalid module title` } };
    }

    const updated = await updateModuleTitle({ moduleId, title: parsed.value });
    if (!updated) {
      return { ok: false, error: { code: "not_found", message: "module gone" } };
    }

    return { ok: true, data: null };
  } catch (error) {
    return toErrorResult(error, "renameModuleAction");
  }
}

/** Debounced autosave for a Lesson title (AC #3). */
export async function renameLessonAction(
  lessonId: string,
  title: string,
): Promise<ActionResult<null>> {
  try {
    const auth = await requireOwner(
      () => getLessonCourseContext(lessonId),
      "lesson",
    );
    if (!auth.ok) return { ok: false, error: auth.error };

    const parsed = parseOutlineTitle(title, LESSON_TITLE_MAX_LENGTH);
    if (!parsed.ok) {
      return { ok: false, error: { code: parsed.error, message: `invalid lesson title` } };
    }

    const updated = await updateLessonTitle({ lessonId, title: parsed.value });
    if (!updated) {
      return { ok: false, error: { code: "not_found", message: "lesson gone" } };
    }

    return { ok: true, data: null };
  } catch (error) {
    return toErrorResult(error, "renameLessonAction");
  }
}

/**
 * Certificate-eligibility toggle (AC #6). Immediate write, not debounced —
 * feeds Epic 4's isCourseComplete() (AD-7).
 */
export async function setLessonRequiredAction(
  lessonId: string,
  required: boolean,
): Promise<ActionResult<{ required: boolean }>> {
  try {
    const auth = await requireOwner(
      () => getLessonCourseContext(lessonId),
      "lesson",
    );
    if (!auth.ok) return { ok: false, error: auth.error };

    const updated = await setLessonRequired({ lessonId, required });
    if (!updated) {
      return { ok: false, error: { code: "not_found", message: "lesson gone" } };
    }

    return { ok: true, data: { required: updated.required } };
  } catch (error) {
    return toErrorResult(error, "setLessonRequiredAction");
  }
}

// ---------------------------------------------------------------------------
// Outline editor: drag / keyboard reorder (Story 2.3)
// ---------------------------------------------------------------------------

/**
 * Cheap fail-fast shape check on a reorder payload before the service runs. The
 * real gate is the service's permutation check against the live sibling set;
 * this only rejects obvious garbage (not an array, non-string members, or
 * duplicates). An empty array is well-formed — the service treats it as a
 * harmless no-op (`{ ok: true }`), so both layers agree.
 */
function isWellFormedIdList(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  if (!value.every((id) => typeof id === "string" && id.length > 0)) return false;
  return new Set(value).size === value.length;
}

/**
 * Reorder a Course's Modules to `orderedModuleIds` (AC #1). Instructor + owner
 * only. Discrete autosave — no `revalidatePath` (it would thrash the RSC
 * payload against the client's optimistic outline). `stale_outline` when the
 * payload no longer matches the course's live module set — the client re-syncs
 * from a fresh `getCourseOutline`.
 */
export async function reorderModulesAction(
  courseId: string,
  orderedModuleIds: string[],
): Promise<ActionResult<null>> {
  try {
    const auth = await requireOwner(async () => {
      const c = await getCourseById(courseId);
      return c ? { instructorId: c.instructorId } : null;
    }, "course");
    if (!auth.ok) return { ok: false, error: auth.error };

    if (!isWellFormedIdList(orderedModuleIds)) {
      return {
        ok: false,
        error: { code: "bad_request", message: "malformed module id list" },
      };
    }

    const result = await reorderModules({ courseId, orderedModuleIds });
    if (!result.ok) {
      return {
        ok: false,
        error: { code: "stale_outline", message: "module set changed — reload" },
      };
    }

    return { ok: true, data: null };
  } catch (error) {
    return toErrorResult(error, "reorderModulesAction");
  }
}

/**
 * Reorder one Module's Lessons to `orderedLessonIds` (AC #1). Instructor +
 * owner only. Lessons reorder *within their Module only* — a foreign lesson id
 * in the payload fails the service's permutation check and returns
 * `stale_outline`.
 */
export async function reorderLessonsAction(
  moduleId: string,
  orderedLessonIds: string[],
): Promise<ActionResult<null>> {
  try {
    const auth = await requireOwner(
      () => getModuleCourseContext(moduleId),
      "module",
    );
    if (!auth.ok) return { ok: false, error: auth.error };

    if (!isWellFormedIdList(orderedLessonIds)) {
      return {
        ok: false,
        error: { code: "bad_request", message: "malformed lesson id list" },
      };
    }

    const result = await reorderLessons({ moduleId, orderedLessonIds });
    if (!result.ok) {
      return {
        ok: false,
        error: { code: "stale_outline", message: "lesson set changed — reload" },
      };
    }

    return { ok: true, data: null };
  } catch (error) {
    return toErrorResult(error, "reorderLessonsAction");
  }
}

// ---------------------------------------------------------------------------
// Lesson content editor: type pick, content autosave, status poll (Story 2.4)
// ---------------------------------------------------------------------------

/**
 * Set a Lesson's type — AD-4 field-group (a), a discrete write. Only succeeds
 * when the type is currently unset (`setLessonType` guards `lesson_type IS
 * NULL`); a second attempt returns `type_already_set` and the client re-syncs.
 * Switching an already-set type is out of scope for Story 2.4. No
 * `revalidatePath` — mirrors the rename / toggle actions.
 */
export async function setLessonTypeAction(
  lessonId: string,
  lessonType: string,
): Promise<ActionResult<{ lessonType: LessonType }>> {
  try {
    const auth = await requireOwner(
      () => getLessonCourseContext(lessonId),
      "lesson",
    );
    if (!auth.ok) return { ok: false, error: auth.error };

    if (!isLessonType(lessonType)) {
      return { ok: false, error: { code: "bad_request", message: "unknown lesson type" } };
    }

    const updated = await setLessonType({ lessonId, lessonType });
    if (!updated) {
      return {
        ok: false,
        error: { code: "type_already_set", message: "lesson type already chosen or gone" },
      };
    }

    return { ok: true, data: { lessonType } };
  } catch (error) {
    return toErrorResult(error, "setLessonTypeAction");
  }
}

/**
 * Debounced autosave for AD-4 field-group (b) — the Lesson's content body. The
 * shape rule lives in `parseLessonContentBody`, branched on the Lesson Type
 * (Story 2.4 only authors Video: `{ note?: string }`). No `revalidatePath` —
 * same reasoning as `renameLessonAction`.
 */
export async function updateLessonContentAction(
  lessonId: string,
  contentBody: unknown,
): Promise<ActionResult<null>> {
  try {
    const data = await getLessonEditorData(lessonId);
    if (!data) {
      return { ok: false, error: { code: "not_found", message: "lesson not found" } };
    }

    const auth = await requireOwner(async () => data, "lesson");
    if (!auth.ok) return { ok: false, error: auth.error };

    if (!data.lesson.lessonType) {
      return {
        ok: false,
        error: { code: "content_invalid", message: "lesson has no type yet" },
      };
    }

    const parsed = parseLessonContentBody(data.lesson.lessonType, contentBody);
    if (!parsed.ok) {
      return { ok: false, error: { code: parsed.error, message: "invalid content body" } };
    }

    const updated = await updateLessonContent({ lessonId, contentBody: parsed.value });
    if (!updated) {
      return { ok: false, error: { code: "not_found", message: "lesson gone" } };
    }

    return { ok: true, data: null };
  } catch (error) {
    return toErrorResult(error, "updateLessonContentAction");
  }
}

/**
 * Owner-guarded lean read of the Video media status — the client polls this on
 * a short interval while an upload is `queued` / `processing`. `data: null`
 * means no video has been uploaded yet.
 */
export async function getVideoStatusAction(
  lessonId: string,
): Promise<
  ActionResult<{
    status: LessonMediaStatus;
    errorReason: string | null;
    durationSeconds: number | null;
  } | null>
> {
  try {
    const auth = await requireOwner(
      () => getLessonCourseContext(lessonId),
      "lesson",
    );
    if (!auth.ok) return { ok: false, error: auth.error };

    const status = await getLessonMediaStatus(lessonId);
    return { ok: true, data: status };
  } catch (error) {
    return toErrorResult(error, "getVideoStatusAction");
  }
}

/**
 * Soft-delete the Lesson's video media row and best-effort delete the Cloudflare
 * Stream asset. Lets an Instructor clear a `failed` upload entirely (vs. only
 * Retry) or drop a `ready` video.
 */
export async function removeVideoAction(
  lessonId: string,
): Promise<ActionResult<null>> {
  try {
    const auth = await requireOwner(
      () => getLessonCourseContext(lessonId),
      "lesson",
    );
    if (!auth.ok) return { ok: false, error: auth.error };

    const { previousAssetId } = await removeVideoMedia({ lessonId });
    // Awaited: `deleteVideo` swallows its own errors, and a fire-and-forget
    // promise can be cut off when the serverless invocation ends.
    if (previousAssetId) await deleteVideo(previousAssetId);

    return { ok: true, data: null };
  } catch (error) {
    return toErrorResult(error, "removeVideoAction");
  }
}
