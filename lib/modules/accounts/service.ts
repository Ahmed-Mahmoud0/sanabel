import { asc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/modules/accounts/schema";

/**
 * Accounts module service layer (AD-1, AD-2). Accounts owns the `user` table,
 * so these functions talk to it with direct Drizzle queries via `lib/db/client`.
 *
 * `setInstructorRole` is a direct write rather than a Better Auth call on
 * purpose: Better Auth's `updateUser` route hardcodes its target to
 * `session.user.id` (no "update another user" endpoint), and `isInstructor` is
 * `input: false` in `additionalFields` so its client SDK cannot set the flag
 * for any target. An admin-driven grant/revoke therefore has to be a write from
 * Accounts' own service layer — which is exactly what AD-1/AD-2 describe, not an
 * AD-3 exception (AD-3 only bars reaching into *another* module's schema).
 *
 * Callers: `lib/modules/accounts/actions.ts` and the admin accounts page only.
 * Authorization lives in the Server Action (`requireRole("admin")`), never here.
 */

/** Trimmed-down Account row shape the admin UI renders. Never the raw record. */
export interface AccountSummary {
  id: string;
  name: string;
  email: string;
  isInstructor: boolean;
  isAdmin: boolean;
}

const accountColumns = {
  id: user.id,
  name: user.name,
  email: user.email,
  isInstructor: user.isInstructor,
  isAdmin: user.isAdmin,
} as const;

/**
 * Hard ceiling on `listAccounts` rows. No pagination in v1 (small-launch scale),
 * but the query is still bounded so the admin page can't stream the whole table
 * into the RSC payload as the user base grows — narrow with the search box.
 */
const LIST_ACCOUNTS_LIMIT = 100;

/**
 * Grant (`true`) or revoke (`false`) the Instructor role on one account.
 * Returns the updated summary, or `null` when no row matched `userId`.
 * `user.updatedAt` bumps automatically via its `$onUpdate` in the schema.
 */
export async function setInstructorRole(
  userId: string,
  isInstructor: boolean,
): Promise<AccountSummary | null> {
  const [updated] = await db
    .update(user)
    .set({ isInstructor })
    .where(eq(user.id, userId))
    .returning(accountColumns);

  return updated ?? null;
}

/** Escape LIKE metacharacters so a user's `%`/`_`/`\` search for a literal. */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * All accounts, optionally filtered by a case-insensitive substring match on
 * email or display name. No pagination — matches this project's small-launch
 * scale (no dedicated search service anywhere else either).
 */
export async function listAccounts(
  { query }: { query?: string } = {},
): Promise<AccountSummary[]> {
  const trimmed = query?.trim();
  const where: SQL | undefined = trimmed
    ? or(
        ilike(user.email, `%${escapeLike(trimmed)}%`),
        ilike(user.name, `%${escapeLike(trimmed)}%`),
      )
    : undefined;

  return db
    .select(accountColumns)
    .from(user)
    .where(where)
    .orderBy(asc(user.name))
    .limit(LIST_ACCOUNTS_LIMIT);
}
