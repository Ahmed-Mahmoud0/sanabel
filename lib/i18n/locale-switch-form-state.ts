"use client";

import { useEffect, useRef } from "react";

interface PersistedField {
  /** Current controlled value. */
  value: string;
  /** State setter used to restore a mirrored value on the next mount. */
  set: (next: string) => void;
  /**
   * Baseline the field starts from — the saved profile name, `""` for a
   * form that starts empty. Only values that differ from the baseline are
   * mirrored, so an untouched form leaves no trace.
   */
  initial?: string;
}

/**
 * Carries a form's in-progress, NON-SENSITIVE field values across a locale
 * switch.
 *
 * Switching locale changes the `[locale]` route segment, which remounts the
 * whole `app/[locale]` subtree and resets Client Component state — the
 * still-open next-intl issue #496, reproduced directly against this app's
 * Next.js 16.2 / next-intl 4.13 in Story 1.6 Task 1 (typed `/sign-up` fields
 * came back empty after the switch). Values are mirrored to `sessionStorage`
 * on change and restored on the next mount, then dropped once the form is
 * submitted via {@link clearLocaleSwitchFormState}.
 *
 * NEVER pass a password (or any secret) field to this hook. A mid-typed
 * password lost on a language switch is a deliberate, documented exception to
 * AC #2 (Story 1.6 Dev Notes): the security cost of putting a credential in
 * web storage is not worth the letter of that AC.
 *
 * Deliberately not a generic "persist any form" abstraction — it is wired into
 * the handful of real forms that exist today (Stories 1.1 auth, 1.5 profile).
 */
export function useLocaleSwitchFormState(
  storageKey: string,
  fields: Record<string, PersistedField>,
): void {
  const didRestore = useRef(false);
  const skipFirstMirror = useRef(true);

  useEffect(() => {
    if (didRestore.current) return;
    didRestore.current = true;

    let stored: Record<string, unknown> | null = null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      stored = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      stored = null;
    }
    if (!stored) return;

    for (const [name, field] of Object.entries(fields)) {
      const next = stored[name];
      if (typeof next === "string" && next !== field.value) {
        field.set(next);
      }
    }
    // Mount-only restore: the ref guard, not a deps list, controls re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snapshot: Record<string, string> = {};
  let dirty = false;
  for (const [name, field] of Object.entries(fields)) {
    if (field.value !== (field.initial ?? "")) {
      snapshot[name] = field.value;
      dirty = true;
    }
  }
  const serialized = JSON.stringify(snapshot);

  useEffect(() => {
    // Skip the first run: it fires with the pre-restore values and would
    // clobber a stored draft before the restore effect's re-render lands.
    if (skipFirstMirror.current) {
      skipFirstMirror.current = false;
      return;
    }
    try {
      if (dirty) sessionStorage.setItem(storageKey, serialized);
      else sessionStorage.removeItem(storageKey);
    } catch {
      // sessionStorage unavailable (private mode / disabled): the feature
      // degrades to "state is lost on switch" — the pre-Story-1.6 behaviour.
    }
  }, [storageKey, serialized, dirty]);
}

/** Drop a form's mirrored draft — call on successful submit. */
export function clearLocaleSwitchFormState(storageKey: string): void {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}
