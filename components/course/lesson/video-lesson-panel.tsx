"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";

import { actionErrorText } from "@/lib/actions/result";
import { formatNumber } from "@/lib/i18n/format";
import {
  getVideoStatusAction,
  removeVideoAction,
  updateLessonContentAction,
} from "@/lib/modules/course-authoring/actions";
import {
  CLOUDFLARE_BASIC_UPLOAD_MAX_BYTES,
  VIDEO_MAX_DURATION_SECONDS_PER_LESSON,
  UPLOAD_EXPIRED_REASON,
  VIDEO_NOTE_MAX_LENGTH,
  type LessonMediaStatus,
} from "@/lib/modules/course-authoring/media";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/form-message";

const POLL_MS = 5000;

type Saver = () => Promise<boolean>;

export interface InitialVideoMedia {
  status: LessonMediaStatus;
  errorReason: string | null;
  durationSeconds: number | null;
}

/**
 * Client status only ever moves forward (queued → processing → ready | failed).
 * The DB stays `queued` until Cloudflare's completion-only webhook, so a poll
 * must never drag an optimistic `processing` back to `queued`. (A new upload
 * resets it explicitly; that is a client-initiated set, not a polled one.)
 */
const STATUS_RANK: Record<LessonMediaStatus, number> = {
  queued: 0,
  processing: 1,
  ready: 2,
  failed: 2,
};

/** `mm:ss`, digits kept Western-Arabic and the readout kept LTR (UX-DR5). */
function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${formatNumber(m)}:${formatNumber(s, { minimumIntegerDigits: 2 })}`;
}

function uploadBytes(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.onabort = () => resolve(false);
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

/**
 * The AC #1–#4 surface for a Video Lesson. Status (`queued | processing |
 * ready | failed`) is always visible — never inferred from silence (AD-5,
 * EXPERIENCE.md "Upload with retry"). Every status is an icon **plus** text
 * (never colour alone — UX-DR9); transitions are announced via `aria-live`
 * (UX-DR11). The caption note autosaves on pause as AD-4 field-group (b),
 * driving the shared header indicator through `scheduleSave`.
 */
export function VideoLessonPanel({
  lessonId,
  initialMedia,
  initialNote,
  streamConfigured,
  scheduleSave,
}: {
  lessonId: string;
  initialMedia: InitialVideoMedia | null;
  initialNote: string;
  streamConfigured: boolean;
  scheduleSave: (fieldKey: string, saver: Saver) => void;
}) {
  const t = useTranslations("Course");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);

  const [status, setStatus] = useState<LessonMediaStatus | null>(
    initialMedia?.status ?? null,
  );
  // Always-current mirrors so the poll's async callback reads the latest status
  // and announcer without being an effect dependency (which reset the interval).
  const statusRef = useRef<LessonMediaStatus | null>(initialMedia?.status ?? null);
  const applyStatus = useCallback((next: LessonMediaStatus | null) => {
    statusRef.current = next;
    setStatus(next);
  }, []);
  const [errorReason, setErrorReason] = useState<string | null>(
    initialMedia?.errorReason ?? null,
  );
  const [durationSeconds, setDurationSeconds] = useState<number | null>(
    initialMedia?.durationSeconds ?? null,
  );
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Mirrors `fileRef.current != null` for render — a retained File means Retry
  // can re-upload without re-selection (AC #3); without one, Retry re-opens the
  // picker (e.g. after a page reload lost the File).
  const [hasRetainedFile, setHasRetainedFile] = useState(false);
  const [note, setNote] = useState(initialNote);
  // aria-live announcement for status transitions. `n` bumps every set so an
  // identical string still re-announces.
  const [announcement, setAnnouncement] = useState<{ text: string; n: number }>({
    text: "",
    n: 0,
  });

  const announce = useCallback((key: "processing" | "ready" | "failed") => {
    setAnnouncement((prev) => ({
      text: t(`lesson.video.announce.${key}`),
      n: prev.n + 1,
    }));
  }, [t]);

  const announceRef = useRef(announce);
  useEffect(() => {
    announceRef.current = announce;
  }, [announce]);

  const errorText = useCallback(
    (code: string) =>
      actionErrorText(
        code,
        {
          file_too_large: t("lesson.video.error.file_too_large"),
          bad_file_type: t("lesson.video.error.bad_file_type"),
          instructor_cap_reached: t("lesson.video.error.instructor_cap_reached"),
          wrong_lesson_type: t("lesson.video.error.wrong_lesson_type"),
          upload_unavailable: t("lesson.video.error.upload_unavailable"),
          provider_error: t("lesson.video.error.provider_error"),
          bad_request: t("lesson.video.error.bad_request"),
          forbidden: t("lesson.video.error.forbidden"),
          not_found: t("lesson.video.error.not_found"),
          upload_in_progress: t("lesson.video.error.upload_in_progress"),
        },
        t("lesson.video.error.generic"),
      ),
    [t],
  );

  // Poll while an upload is in flight — the webhook updates the DB out of band.
  const inFlight = status === "queued" || status === "processing";
  useEffect(() => {
    if (!inFlight) return;
    let cancelled = false;

    async function tick() {
      const res = await getVideoStatusAction(lessonId);
      if (cancelled || !res.ok || !res.data) return;
      const current = statusRef.current;
      const next = res.data.status;
      // Forward-only: ignore a polled status that would move backwards.
      if (current !== null && STATUS_RANK[next] < STATUS_RANK[current]) return;
      setErrorReason(res.data.errorReason);
      setDurationSeconds(res.data.durationSeconds);
      if (next !== current) {
        applyStatus(next);
        if (next === "ready") announceRef.current("ready");
        if (next === "failed") announceRef.current("failed");
      }
    }

    const id = setInterval(tick, POLL_MS);
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [inFlight, lessonId, applyStatus]);

  async function startUpload(file: File) {
    fileRef.current = file;
    setHasRetainedFile(true);
    setUploadError(null);

    if (!file.type.startsWith("video/")) {
      setUploadError(errorText("bad_file_type"));
      return;
    }
    // Fallback path: the basic direct POST caps at 200 MB and no tus client is
    // bundled — reject a larger file up front with the same "too large" copy.
    if (file.size > CLOUDFLARE_BASIC_UPLOAD_MAX_BYTES) {
      setUploadError(errorText("file_too_large"));
      return;
    }

    // Remembered so a server-rejected *replace* restores the existing video
    // instead of showing the empty upload UI (the DB still holds it).
    const previous = { status, errorReason, durationSeconds };

    setBusy(true);
    setUploadPct(0);
    applyStatus("queued");
    try {
      const initRes = await fetch("/api/instructor/video-uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          fileName: file.name,
          fileType: file.type,
          fileSizeBytes: file.size,
        }),
      });
      const body = (await initRes.json().catch(() => null)) as
        | { ok: true; data: { uploadURL: string } }
        | { ok: false; error: { code: string } }
        | null;

      if (!body || body.ok === false) {
        setUploadError(errorText(body?.ok === false ? body.error.code : "generic"));
        applyStatus(previous.status);
        setErrorReason(previous.errorReason);
        setDurationSeconds(previous.durationSeconds);
        setUploadPct(null);
        return;
      }

      const uploaded = await uploadBytes(body.data.uploadURL, file, setUploadPct);
      setUploadPct(null);
      if (!uploaded) {
        setUploadError(errorText("generic"));
        setErrorReason(null);
        applyStatus("failed");
        announce("failed");
        return;
      }

      // Bytes are in — Cloudflare is now transcoding. The webhook confirms.
      applyStatus("processing");
      announce("processing");
    } catch {
      setUploadError(errorText("generic"));
      setErrorReason(null);
      applyStatus("failed");
      setUploadPct(null);
      announce("failed");
    } finally {
      setBusy(false);
    }
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (file) void startUpload(file);
  }

  function handleRetry() {
    if (fileRef.current) {
      void startUpload(fileRef.current);
    } else {
      inputRef.current?.click();
    }
  }

  async function handleRemove() {
    if (busy) return;
    if (!window.confirm(t("lesson.video.removeConfirm"))) return;
    setBusy(true);
    setUploadError(null);
    try {
      const res = await removeVideoAction(lessonId);
      if (!res.ok) {
        setUploadError(errorText(res.error.code));
        return;
      }
      fileRef.current = null;
      setHasRetainedFile(false);
      applyStatus(null);
      setErrorReason(null);
      setDurationSeconds(null);
    } finally {
      setBusy(false);
    }
  }

  function handleNoteChange(value: string) {
    setNote(value);
    scheduleSave(
      `content:${lessonId}`,
      async () => (await updateLessonContentAction(lessonId, { note: value })).ok,
    );
  }

  const uploadDisabled = busy || !streamConfigured;

  return (
    <section className="mt-6 flex flex-col gap-4">
      <h2 className="text-heading-md text-text-primary">
        {t("outline.lessonType.video")}
      </h2>

      {!streamConfigured && (
        <FormMessage tone="error">
          {t("lesson.video.error.upload_unavailable")}
        </FormMessage>
      )}

      {/* --- No video yet --- */}
      {status === null && (
        <div className="rounded-lg border border-dashed border-border-hairline bg-surface-raised p-6">
          <label
            className={
              "inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted " +
              (uploadDisabled ? "pointer-events-none opacity-50" : "")
            }
          >
            <UploadCloud className="size-4" aria-hidden="true" />
            {t("lesson.video.uploadCta")}
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="sr-only"
              disabled={uploadDisabled}
              onChange={onFileChange}
            />
          </label>
          <p className="mt-2 text-body-sm text-text-secondary">
            {t("lesson.video.sizeHint", {
              minutes: formatNumber(VIDEO_MAX_DURATION_SECONDS_PER_LESSON / 60),
            })}
          </p>
        </div>
      )}

      {/* --- Uploading bytes (local progress) --- */}
      {uploadPct !== null && (
        <div
          className="flex items-center gap-2 rounded-md bg-surface-sunken px-3 py-3 text-body-sm text-text-secondary"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={uploadPct}
          aria-label={t("lesson.video.uploadCta")}
        >
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
          <span>
            {t.rich("lesson.video.uploading", {
              percent: formatNumber(uploadPct),
              num: (chunks) => <bdi dir="ltr">{chunks}</bdi>,
            })}
          </span>
        </div>
      )}

      {/* --- queued / processing --- */}
      {(status === "queued" || status === "processing") && uploadPct === null && (
        <div className="flex items-start gap-3 rounded-md bg-surface-sunken px-3 py-3">
          <Loader2
            className="mt-0.5 size-5 shrink-0 animate-spin text-warning"
            aria-hidden="true"
          />
          <p className="text-body-sm text-text-secondary">
            {status === "queued"
              ? t("lesson.video.queued")
              : t("lesson.video.processing")}
          </p>
        </div>
      )}

      {/* --- ready --- */}
      {status === "ready" && (
        <div className="flex flex-col gap-3 rounded-md bg-surface-sunken px-3 py-3">
          <p className="flex items-center gap-2 text-body-sm font-medium text-success">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
            {durationSeconds
              ? t.rich("lesson.video.readyDuration", {
                  duration: formatDuration(durationSeconds),
                  num: (chunks) => <bdi dir="ltr">{chunks}</bdi>,
                })
              : t("lesson.video.ready")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={uploadDisabled}
              onClick={() => inputRef.current?.click()}
            >
              {t("lesson.video.replace")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={handleRemove}
            >
              {t("lesson.video.remove")}
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="sr-only"
            disabled={uploadDisabled}
            onChange={onFileChange}
          />
        </div>
      )}

      {/* --- failed --- */}
      {status === "failed" && (
        <div className="flex flex-col gap-3 rounded-md border border-error/30 bg-error/10 px-3 py-3">
          <p className="flex items-center gap-2 text-body-sm font-semibold text-error">
            <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
            {t("lesson.video.failed")}
          </p>
          {errorReason && (
            <p className="text-body-sm text-text-secondary">
              {errorReason === UPLOAD_EXPIRED_REASON
                ? t("lesson.video.error.upload_expired")
                : t("lesson.video.failedReason", { reason: errorReason })}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={handleRetry}>
              {t("lesson.video.retry")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={handleRemove}
            >
              {t("lesson.video.remove")}
            </Button>
          </div>
          {!hasRetainedFile && (
            <p className="text-body-sm text-text-secondary">
              {t("lesson.video.retryReselectHint")}
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="sr-only"
            disabled={uploadDisabled}
            onChange={onFileChange}
          />
        </div>
      )}

      {uploadError && <FormMessage tone="error">{uploadError}</FormMessage>}

      {/* --- caption note (AD-4 field-group b) --- */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`lesson-${lessonId}-note`}
          className="text-body-sm font-medium text-text-secondary"
        >
          {t("lesson.video.noteLabel")}
        </label>
        <textarea
          id={`lesson-${lessonId}-note`}
          value={note}
          onChange={(event) => handleNoteChange(event.target.value)}
          maxLength={VIDEO_NOTE_MAX_LENGTH}
          rows={3}
          placeholder={t("lesson.video.notePlaceholder")}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement.text}
        {announcement.n % 2 === 0 ? "" : "​"}
      </div>
    </section>
  );
}
