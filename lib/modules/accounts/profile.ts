/**
 * Accounts module — public profile shared constants (Story 1.5).
 *
 * Deliberately import-free (no `db`, no server-only code) so both the server
 * (`lib/auth/config.ts` bio validator) and the client profile form can pull the
 * same number. Keep it that way.
 */

/**
 * Soft cap on the free-text Instructor bio. Nothing in the epics or the
 * architecture pins a number — this is a judgment call to keep an otherwise
 * unbounded free-text field in check. 280 mirrors a familiar short-bio length.
 * Enforced client-side (textarea `maxLength` + visible counter) and server-side
 * (the `bio` field's `validator.input` in `lib/auth/config.ts`).
 */
export const BIO_MAX_LENGTH = 280;
