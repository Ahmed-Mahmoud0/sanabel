"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { ActionResult } from "@/lib/actions/result";
import { AuthorizationError, requireRole } from "@/lib/auth/authorization";
import { setInstructorRole } from "@/lib/modules/accounts/service";

/**
 * Accounts module Server Actions (AD-1). This is the first real consumer of the
 * Server-Action half of AD-6's convention: pages/layouts guard with
 * `can()`/`notFound()`; Server Actions guard with `requireRole()` (throws).
 *
 * Consistency Conventions pin every Server Action to a discriminated union and
 * "never throw across the client boundary". `requireRole()`'s throw is an
 * internal detail this action must *absorb*, not propagate — so the whole body
 * runs inside try/catch and every failure becomes `{ok:false, error}`.
 */

/**
 * Grant or revoke the Instructor role on any account (FR-4). Admin only.
 * No carve-out for the admin's own row — FR-4 says "any account" and AD-6's
 * roles are additive, so an admin granting themselves Instructor is valid.
 */
export async function setInstructorRoleAction(
  userId: string,
  isInstructor: boolean,
): Promise<ActionResult<{ userId: string; isInstructor: boolean }>> {
  try {
    await requireRole("admin");

    const updated = await setInstructorRole(userId, isInstructor);
    if (!updated) {
      return {
        ok: false,
        error: { code: "not_found", message: `no account with id ${userId}` },
      };
    }

    // Re-render the accounts list so the row's badge/button reflect the change
    // without a full reload. Path is the route pattern (dynamic `[locale]` +
    // `type: "page"`); route groups like `(admin)` are not part of it.
    revalidatePath("/[locale]/accounts", "page");

    return {
      ok: true,
      data: { userId: updated.id, isInstructor: updated.isInstructor },
    };
  } catch (error) {
    // Never swallow Next.js control-flow signals (redirect/notFound/etc.).
    unstable_rethrow(error);

    if (error instanceof AuthorizationError) {
      return {
        ok: false,
        error: { code: "forbidden", message: "caller lacks admin role" },
      };
    }

    console.error("[accounts] setInstructorRoleAction failed", error);
    return {
      ok: false,
      error: { code: "unknown", message: "unexpected error in setInstructorRoleAction" },
    };
  }
}
