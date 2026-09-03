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
  /**
   * Discrete (non-debounced) save for `fieldKey` — for one-shot changes like a
   * drag/keyboard reorder, not typed text. Dispatches immediately; if a save
   * for the same `fieldKey` is already in flight, the newest `saver` is held in
   * a 1-slot pending slot and run once the in-flight one settles (latest wins,
   * never a queue of stale intermediate states). Drives `editing → saving →
   * saved` on success; on failure it does **not** light the header `error` /
   * Retry channel (the caller owns recovery — an inline message + a re-sync —
   * the same split Story 2.2 landed for add / certificate-toggle failures).
   */
  save: (fieldKey: string, saver: Saver) => void;
  /** Re-run every field whose last save failed. */
  retry: () => void;
}

export function useOutlineAutosave(): OutlineAutosave {
  const [status, setStatus] = useState<OutlineSaveStatus>("idle");

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queued = useRef(new Map<string, Saver>());
  const failed = useRef(new Map<string, Saver>());
  const inFlight = useRef(0);
  // Discrete (`save`) coalescing: keys with a discrete write in flight, and a
  // 1-slot "latest superseding saver" per key.
  const discreteInFlight = useRef(new Set<string>());
  const discretePending = useRef(new Map<string, Saver>());

  // A failed *title* save (`runSave`) parks in `failed.current` and holds the
  // header on "error" (with its Retry). Discrete reorder saves share this
  // `status`, so their transitions must never quietly overwrite that "error":
  // if anything is still in `failed`, "error" wins over "editing"/"saving"/
  // "idle" (but not over an explicit "saved"/"error").
  const applyStatus = useCallback((next: OutlineSaveStatus) => {
    const clobbersTitleError =
      failed.current.size > 0 && next !== "error" && next !== "saved";
    setStatus(clobbersTitleError ? "error" : next);
  }, []);

  const settle = useCallback(() => {
    if (inFlight.current === 0 && timers.current.size === 0) {
      setStatus(failed.current.size === 0 ? "saved" : "error");
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

  const runDiscrete = useCallback(
    async (fieldKey: string, initialSaver: Saver) => {
      discreteInFlight.current.add(fieldKey);
      inFlight.current += 1;
      applyStatus("saving");

      // Drain the field: run the saver, then any newer saver that arrived
      // mid-flight (a 1-slot latest-wins slot — never a queue of stale
      // intermediate states). A **failed** saver stops the drain and drops the
      // parked one: the caller is now rolling back / re-syncing, so running a
      // queued newer order on top of that would fight the recovery and could
      // leave the DB ahead of the screen.
      let saver: Saver | undefined = initialSaver;
      let lastOk = false;
      while (saver) {
        try {
          lastOk = await saver();
        } catch {
          lastOk = false;
        }
        if (!lastOk) {
          discretePending.current.delete(fieldKey);
          break;
        }
        saver = discretePending.current.get(fieldKey);
        discretePending.current.delete(fieldKey);
      }

      inFlight.current -= 1;
      discreteInFlight.current.delete(fieldKey);

      // Success advances the header to "Saved."; a failed discrete save falls
      // back to a neutral header (no sticky error / dead Retry of its own — the
      // caller surfaces it inline and re-syncs) unless a *title* save is still
      // failed, in which case its "error" is restored rather than clobbered.
      if (lastOk) {
        settle();
      } else if (inFlight.current === 0 && timers.current.size === 0) {
        applyStatus("idle");
      }
    },
    [applyStatus, settle],
  );

  const save = useCallback(
    (fieldKey: string, saver: Saver) => {
      applyStatus("editing");
      if (discreteInFlight.current.has(fieldKey)) {
        discretePending.current.set(fieldKey, saver);
        return;
      }
      void runDiscrete(fieldKey, saver);
    },
    [applyStatus, runDiscrete],
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

  return { status, schedule, save, retry };
}
