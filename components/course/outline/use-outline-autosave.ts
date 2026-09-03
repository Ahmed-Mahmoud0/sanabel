"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Autosave engine for the outline editor (AC #3, AC #4). Scoped to this feature
 * in the spirit of `useLocaleSwitchFormState` — not a general "autosave
 * anything" abstraction.
 *
 * Per AD-4: field-group (a) "outline metadata" saves are debounced, each field
 * tracked independently, last-write-wins. This story only edits the `title`
 * sub-part, so one debounced call per Module/Lesson title. A newer edit to the
 * same field supersedes an older queued one (the timer is reset and the saver
 * closure replaced), so only the latest value is ever sent.
 *
 * AC #4 (crash recovery) is satisfied structurally: the debounced write lands in
 * Postgres; on reopen the Server Component re-fetches. Only sub-second
 * un-flushed keystrokes are lost, which AC #4 explicitly accepts. No
 * localStorage draft layer.
 */

export type OutlineSaveStatus = "idle" | "editing" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 700; // within AC #3's 600–800ms window

/** A save attempt for one field; resolves `true` on success. */
type Saver = () => Promise<boolean>;

export interface OutlineAutosave {
  status: OutlineSaveStatus;
  /** Call on every keystroke for `fieldKey`; debounced dispatch of `saver`. */
  schedule: (fieldKey: string, saver: Saver) => void;
  /** Re-run every field whose last save failed. */
  retry: () => void;
}

export function useOutlineAutosave(): OutlineAutosave {
  const [status, setStatus] = useState<OutlineSaveStatus>("idle");

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queued = useRef(new Map<string, Saver>());
  const failed = useRef(new Map<string, Saver>());
  const inFlight = useRef(0);

  const settle = useCallback(() => {
    if (
      inFlight.current === 0 &&
      timers.current.size === 0 &&
      failed.current.size === 0
    ) {
      setStatus("saved");
    }
  }, []);

  const runSave = useCallback(
    async (fieldKey: string, saver: Saver) => {
      inFlight.current += 1;
      setStatus("saving");

      let ok = false;
      try {
        ok = await saver();
      } catch {
        ok = false;
      }

      inFlight.current -= 1;

      if (ok) {
        failed.current.delete(fieldKey);
        settle();
      } else {
        failed.current.set(fieldKey, saver);
        setStatus("error");
      }
    },
    [settle],
  );

  const schedule = useCallback(
    (fieldKey: string, saver: Saver) => {
      setStatus("editing");

      const existing = timers.current.get(fieldKey);
      if (existing) clearTimeout(existing);

      queued.current.set(fieldKey, saver);

      const timer = setTimeout(() => {
        timers.current.delete(fieldKey);
        const next = queued.current.get(fieldKey);
        queued.current.delete(fieldKey);
        if (next) void runSave(fieldKey, next);
      }, DEBOUNCE_MS);

      timers.current.set(fieldKey, timer);
    },
    [runSave],
  );

  const retry = useCallback(() => {
    const entries = Array.from(failed.current.entries());
    failed.current.clear();
    if (entries.length === 0) return;
    for (const [fieldKey, saver] of entries) void runSave(fieldKey, saver);
  }, [runSave]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
    };
  }, []);

  return { status, schedule, retry };
}
