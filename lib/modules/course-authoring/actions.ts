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
  LESSON_TITLE_MAX_LENGTH,
  MODULE_TITLE_MAX_LENGTH,
  parseCourseFields,
  parseOutlineTitle,
} from "@/lib/modules/course-authoring/course";
import {
  addLesson,
  addModule,
  createCourse,
  getCourseById,
  getLessonCourseContext,
  getModuleCourseContext,
  setLessonRequired,
  updateLessonTitle,
  updateModuleTitle,
  type OutlineLesson,
  type OutlineModule,
} from "@/lib/modules/course-authoring/service";

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
