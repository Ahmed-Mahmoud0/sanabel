"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import type { ActionResult } from "@/lib/actions/result";
import { AuthorizationError, requireRole } from "@/lib/auth/authorization";
import { parseCourseFields } from "@/lib/modules/course-authoring/course";
import { createCourse } from "@/lib/modules/course-authoring/service";

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
