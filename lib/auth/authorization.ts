import { cache } from "react";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { auth } from "@/lib/auth/config";

/**
 * Shared authorization helpers (AD-6). All role checks in the app go through
 * this module — `app/` and other modules never read role flags off the
 * session directly, and never query the `user` table for them.
 *
 * AD-6 phrases `can()` generically as `can(action, resource)` to leave room
 * for resource-level checks later (e.g. Epic 2 course ownership). This story
 * only needs the role overload; a future story adding resource-scoped checks
 * should extend THIS module rather than start a second helper file.
 */

export type Role = "instructor" | "admin";

/** Session user shape, including the AD-6 additive role flags. */
export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>["user"];

/**
 * Server-only (Server Components, route handlers, server actions). Reads the
 * current session user straight from the database via Better Auth.
 *
 * `session.cookieCache` is deliberately never enabled (see lib/auth/config.ts),
 * so every call is an authoritative read — this is what makes AD-6's "a role
 * revoke takes effect on the next request" hold. `cache()` only dedupes within
 * a single request (SiteHeader plus a route-group guard both call this), so
 * cross-request freshness is unaffected.
 *
 * Returns `null` when there is no session, and also when the session store is
 * momentarily unreachable — this runs in the root layout via SiteHeader, so a
 * thrown error would 500 every route. Callers fail closed (treated as
 * signed-out); the guard layouts then render their 404 / sign-in redirect.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
  } catch (error) {
    // Never swallow Next.js control-flow signals (headers()/cookies() bail-out
    // during static generation, notFound(), redirect()) — only genuine
    // session-store failures.
    unstable_rethrow(error);
    console.error("[auth] getSession failed; treating request as signed-out", error);
    return null;
  }
});

/** Thrown by {@link requireRole} when the current user lacks the role. */
export class AuthorizationError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Pure role check against an already-loaded session user — the single source
 * of truth for how a role maps to a flag. `can()` and the nav header both go
 * through this so they can't drift apart.
 *
 * Admin does NOT imply Instructor — the flags are independent and additive
 * (AD-6). Each role is checked strictly against its own flag.
 */
export function hasRole(user: SessionUser | null, role: Role): user is SessionUser {
  if (!user) return false;
  return role === "instructor" ? user.isInstructor === true : user.isAdmin === true;
}

/**
 * Boolean role check — never throws. Returns `false` for a signed-out user or
 * one missing the role.
 */
export async function can(role: Role): Promise<boolean> {
  return hasRole(await getSessionUser(), role);
}

/**
 * Asserting role check — throws {@link AuthorizationError} when the current
 * user lacks the role, per AD-6's pinned failure semantics (never a silent
 * `false`). Returns the session user on success. Use in Server Actions and
 * Route Handlers, which have no guard layout to sit behind.
 */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!hasRole(user, role)) {
    throw new AuthorizationError(`Requires ${role} role`);
  }
  return user;
}
