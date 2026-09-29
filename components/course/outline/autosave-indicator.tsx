"use client";

import type { OutlineSaveStatus } from "./use-outline-autosave";

/**
 * The shared "Editing… → Saved." header indicator for the autosave hook
 * (`useOutlineAutosave`). Lifted out of `outline-editor.tsx` in Story 2.4 so
 * the lesson editor (`components/course/lesson/lesson-editor.tsx`) reuses the
 * exact same treatment — AD-4's two field-groups (outline metadata, content
 * body) drive one visible indicator on whichever surface is open.
 *
 * Text lives in `role="status" aria-live="polite"` so "Editing…" / "Saved." are
 * announced (AC #3 of Story 2.2, UX-DR11/12).
 */
export function AutosaveIndicator({
  status,
  editingText,
  savedText,
  errorText,
  retryText,
  onRetry,
}: {
  status: OutlineSaveStatus;
  editingText: string;
  savedText: string;
  errorText: string;
  retryText: string;
  onRetry: () => void;
}) {
  const text =
    status === "editing" || status === "saving"
      ? editingText
      : status === "saved"
        ? savedText
        : status === "error"
          ? errorText
          : "";

  return (
    <div className="flex items-center gap-2 text-body-sm text-text-secondary">
      <span role="status" aria-live="polite">
        {text}
      </span>
      {status === "error" && (
        <button
          type="button"
          onClick={onRetry}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {retryText}
        </button>
      )}
    </div>
  );
}
