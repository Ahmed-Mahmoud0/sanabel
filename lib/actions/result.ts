/**
 * Shared Server Action result contract (Consistency Conventions).
 *
 * Every Server Action returns this discriminated union — it never throws across
 * the client boundary. `code` is the stable, machine-readable key the client
 * maps to a localized string; `message` is a non-localized diagnostic for logs
 * / telemetry only and must never be rendered.
 *
 * Lives here (not in any one module's `actions.ts`) so a module never has to
 * re-declare it, and a shape change happens in one place.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

/**
 * Resolve a Server Action error `code` to a localized, user-facing string.
 *
 * `messages` supplies the per-caller `code -> string` entries (already run
 * through `t()`); `fallback` covers every code not in the map, including the
 * generic `"unknown"`. Keeps each form from re-implementing the same `switch`.
 */
export function actionErrorText(
  code: string,
  messages: Partial<Record<string, string>>,
  fallback: string,
): string {
  return messages[code] ?? fallback;
}
