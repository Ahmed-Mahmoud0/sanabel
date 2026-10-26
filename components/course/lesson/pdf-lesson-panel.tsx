"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";

import { actionErrorText } from "@/lib/actions/result";
import { formatNumber } from "@/lib/i18n/format";
import {
  removePdfAction,
  restorePreviousPdfAction,
  updateLessonContentAction,
} from "@/lib/modules/course-authoring/actions";
import {
  PDF_ALLOWED_MIME_TYPE,
  PDF_ERROR_MISSING,
  PDF_ERROR_NOT_A_PDF,
  PDF_ERROR_TOO_LARGE,
  PDF_MAX_BYTES_PER_LESSON,
  PDF_NOTE_MAX_LENGTH,
  UPLOAD_EXPIRED_REASON,
  type LessonMediaStatus,
} from "@/lib/modules/course-authoring/media";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/form-message";

type Saver = () => Promise<boolean>;

/** The kept previous PDF of an in-flight / failed replace (nothing is lost until the new one is ready). */
export interface PreviousPdf {
  fileName: string | null;
  sizeBytes: number | null;
}

export interface InitialPdfMedia {
  status: LessonMediaStatus;
  errorReason: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  previous: PreviousPdf | null;
}

const MB = 1024 * 1024;

/** Size in MB with one decimal, digits kept Western-Arabic. */
function formatMegabytes(bytes: number): string {
  return formatNumber(bytes / MB, { maximumFractionDigits: 1 });
}

/** Browsers sometimes report an empty `type` for a `.pdf`; fall back to the extension. */
function pdfMimeOf(file: File): string {
  if (file.type !== "") return file.type;
  return file.name.toLowerCase().endsWith(".pdf") ? PDF_ALLOWED_MIME_TYPE : "";
}

/**
 * PUT the raw bytes to the presigned R2 URL. The body is the file itself (not
 * `FormData`: R2 stores the request body as the object, so a multipart wrapper
 * would corrupt the PDF) and `Content-Type` must match what was signed.
 */
function putBytes(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", PDF_ALLOWED_MIME_TYPE);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.onabort = () => resolve(false);
    xhr.send(file);
  });
}

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string } };

async function postJson<T>(url: string, payload: unknown): Promise<ApiResult<T> | null> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await response.json().catch(() => null)) as ApiResult<T> | null;
}

/**
 * The AC #1–#4 surface for a PDF Lesson. Status (`queued | ready | failed`) is
 * always visible and every state is an icon **plus** text (UX-DR9, UX-DR13);
 * transitions are announced via `aria-live` (UX-DR11). PDF status is synchronous
 * (AD-5) — there is no webhook, so nothing polls: the bytes go browser → R2
 * directly, then `pdf-uploads/complete` validates server-side and returns the
 * final state. The optional description note autosaves on pause as AD-4
 * field-group (b); replacing the file is a discrete upload on the media record,
 * independent of the outline-metadata autosave.
 */
export function PdfLessonPanel({
  lessonId,
  initialPdf,
  initialNote,
  storageConfigured,
  scheduleSave,
}: {
  lessonId: string;
  initialPdf: InitialPdfMedia | null;
  initialNote: string;
  storageConfigured: boolean;
  scheduleSave: (fieldKey: string, saver: Saver) => void;
}) {
  const t = useTranslations("Course");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const inputId = `lesson-${lessonId}-pdf-file`;

  const [status, setStatus] = useState<LessonMediaStatus | null>(
    initialPdf?.status ?? null,
  );
  const [errorReason, setErrorReason] = useState<string | null>(
    initialPdf?.errorReason ?? null,
  );
  const [fileName, setFileName] = useState<string | null>(
    initialPdf?.fileName ?? null,
  );
  const [sizeBytes, setSizeBytes] = useState<number | null>(
    initialPdf?.sizeBytes ?? null,
  );
  // The kept previous PDF while a replace is in flight or failed: it can be
  // restored, and is deleted server-side only once the new upload is `ready`.
  const [previousPdf, setPreviousPdf] = useState<PreviousPdf | null>(
    initialPdf?.previous ?? null,
  );
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  // Transient: bytes are in R2, the server is validating them. Not persisted.
  const [validating, setValidating] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // A retained File means Retry can re-upload without re-selection (AC #3);
  // after a reload it is gone and Retry re-opens the picker instead.
  const [hasRetainedFile, setHasRetainedFile] = useState(false);
  const [note, setNote] = useState(initialNote);
  const [announcement, setAnnouncement] = useState<{ text: string; n: number }>({
    text: "",
    n: 0,
  });

  const announce = useCallback(
    (key: "validating" | "ready" | "failed") => {
      setAnnouncement((prev) => ({
        text: t(`lesson.pdf.announce.${key}`),
        n: prev.n + 1,
      }));
    },
    [t],
  );

  const errorText = useCallback(
    (code: string) =>
      actionErrorText(
        code,
        {
          file_too_large: t("lesson.pdf.error.file_too_large", {
            mb: formatNumber(PDF_MAX_BYTES_PER_LESSON / MB),
          }),
          bad_file_type: t("lesson.pdf.error.bad_file_type"),
          instructor_cap_reached: t("lesson.pdf.error.instructor_cap_reached"),
          wrong_lesson_type: t("lesson.pdf.error.wrong_lesson_type"),
          upload_unavailable: t("lesson.pdf.error.upload_unavailable"),
          provider_error: t("lesson.pdf.error.provider_error"),
          bad_request: t("lesson.pdf.error.bad_request"),
          forbidden: t("lesson.pdf.error.forbidden"),
          not_found: t("lesson.pdf.error.not_found"),
          upload_in_progress: t("lesson.pdf.error.upload_in_progress"),
        },
        t("lesson.pdf.error.generic"),
      ),
    [t],
  );

  function reasonText(reason: string): string {
    switch (reason) {
      case PDF_ERROR_NOT_A_PDF:
        return t("lesson.pdf.error.not_a_pdf");
      case PDF_ERROR_TOO_LARGE:
        return t("lesson.pdf.error.too_large");
      case PDF_ERROR_MISSING:
        return t("lesson.pdf.error.upload_missing");
      case UPLOAD_EXPIRED_REASON:
        return t("lesson.pdf.error.upload_expired");
      default:
        return t("lesson.pdf.failedReason", { reason });
    }
  }

  async function startUpload(file: File) {
    setUploadError(null);

    // Client pre-checks are UX only — the server is authoritative (AD-5). The
    // per-Instructor cap is deliberately not re-implemented here. A rejected
    // file must not replace the retained one Retry would re-upload.
    if (pdfMimeOf(file) !== PDF_ALLOWED_MIME_TYPE) {
      setUploadError(errorText("bad_file_type"));
      return;
    }
    if (file.size > PDF_MAX_BYTES_PER_LESSON) {
      setUploadError(errorText("file_too_large"));
      return;
    }
    fileRef.current = file;
    setHasRetainedFile(true);

    // Remembered so a server-rejected *replace* restores the existing PDF
    // instead of showing the empty upload UI (the DB still holds it).
    const previous = { status, errorReason, fileName, sizeBytes, previousPdf };
    const restorePrevious = () => {
      setStatus(previous.status);
      setErrorReason(previous.errorReason);
      setFileName(previous.fileName);
      setSizeBytes(previous.sizeBytes);
      setPreviousPdf(previous.previousPdf);
    };
    // A `ready` PDF is kept server-side as the previous one for the duration of
    // the replace; an unfinished/failed attempt just carries over what it held.
    if (status === "ready") {
      setPreviousPdf({ fileName, sizeBytes });
    }

    setBusy(true);
    setUploadPct(0);
    setStatus("queued");
    setErrorReason(null);
    setFileName(file.name);
    setSizeBytes(file.size);

    const failLocally = (code: string) => {
      setUploadError(errorText(code));
      setStatus("failed");
      setErrorReason(null);
      announce("failed");
    };

    // Until initiation answers, the server still holds the previous state, so
    // an exception there must restore it rather than show a failed upload.
    let initiated = false;
    try {
      const init = await postJson<{ uploadURL: string }>(
        "/api/instructor/pdf-uploads",
        {
          lessonId,
          fileName: file.name,
          fileType: PDF_ALLOWED_MIME_TYPE,
          fileSizeBytes: file.size,
        },
      );
      initiated = true;
      if (!init || init.ok === false) {
        setUploadError(errorText(init?.ok === false ? init.error.code : "generic"));
        restorePrevious();
        setUploadPct(null);
        return;
      }

      const uploaded = await putBytes(init.data.uploadURL, file, setUploadPct);
      setUploadPct(null);
      if (!uploaded) {
        failLocally("generic");
        return;
      }

      setValidating(true);
      announce("validating");
      const done = await postJson<{
        status: LessonMediaStatus;
        errorReason: string | null;
        hasPrevious: boolean;
      }>("/api/instructor/pdf-uploads/complete", { lessonId });
      if (!done || done.ok === false) {
        // Transient provider trouble leaves the row `queued`; Retry re-runs.
        failLocally(done?.ok === false ? done.error.code : "generic");
        return;
      }

      setStatus(done.data.status);
      setErrorReason(done.data.errorReason);
      // `ready` deletes the kept previous PDF server-side.
      if (!done.data.hasPrevious) setPreviousPdf(null);
      announce(done.data.status === "ready" ? "ready" : "failed");
    } catch {
      setUploadPct(null);
      if (initiated) {
        failLocally("generic");
      } else {
        setUploadError(errorText("generic"));
        restorePrevious();
      }
    } finally {
      setValidating(false);
      setBusy(false);
    }
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file
    if (file) void startUpload(file);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  function handleRetry() {
    if (fileRef.current) {
      void startUpload(fileRef.current);
    } else {
      openPicker();
    }
  }

  async function handleRemove() {
    if (busy) return;
    if (!window.confirm(t("lesson.pdf.removeConfirm"))) return;
    setBusy(true);
    setUploadError(null);
    try {
      const res = await removePdfAction(lessonId);
      if (!res.ok) {
        setUploadError(errorText(res.error.code));
        return;
      }
      fileRef.current = null;
      setHasRetainedFile(false);
      setStatus(null);
      setErrorReason(null);
      setFileName(null);
      setSizeBytes(null);
      setPreviousPdf(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (busy) return;
    setBusy(true);
    setUploadError(null);
    try {
      const res = await restorePreviousPdfAction(lessonId);
      if (!res.ok) {
        setUploadError(errorText(res.error.code));
        return;
      }
      fileRef.current = null;
      setHasRetainedFile(false);
      setStatus("ready");
      setErrorReason(null);
      setFileName(res.data.fileName);
      setSizeBytes(res.data.sizeBytes);
      setPreviousPdf(null);
      announce("ready");
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

  const uploadDisabled = busy || !storageConfigured;
  // "Your previous PDF is still saved" — shown wherever the restore button is.
  const previousNote = previousPdf ? (
    <p className="text-body-sm text-text-secondary">
      {previousPdf.fileName
        ? t.rich("lesson.pdf.previousKeptNamed", {
            name: previousPdf.fileName,
            file: (chunks) => (
              <bdi dir="auto" className="break-all">
                {chunks}
              </bdi>
            ),
          })
        : t("lesson.pdf.previousKept")}
    </p>
  ) : null;
  const nameNode = fileName ? (
    <bdi dir="auto" className="break-all">
      {fileName}
    </bdi>
  ) : null;

  return (
    <section className="mt-6 flex flex-col gap-4">
      <h2 className="text-heading-md text-text-primary">
        {t("outline.lessonType.pdf")}
      </h2>

      {!storageConfigured && (
        <FormMessage tone="error">{t("lesson.pdf.error.upload_unavailable")}</FormMessage>
      )}

      {/* One always-mounted picker so Retry / Replace / Choose another can open it. */}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={status === null ? 0 : -1}
        aria-label={status === null ? undefined : t("lesson.pdf.uploadCta")}
        disabled={uploadDisabled}
        onChange={onFileChange}
      />

      {/* --- No PDF yet --- */}
      {status === null && (
        <div className="rounded-lg border border-dashed border-border-hairline bg-surface-raised p-6">
          <label
            htmlFor={inputId}
            className={
              "inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 " +
              (uploadDisabled ? "pointer-events-none opacity-50" : "")
            }
          >
            <UploadCloud className="size-4" aria-hidden="true" />
            {t("lesson.pdf.uploadCta")}
          </label>
          <p className="mt-2 text-body-sm text-text-secondary">
            {t("lesson.pdf.sizeHint", {
              mb: formatNumber(PDF_MAX_BYTES_PER_LESSON / MB),
            })}
          </p>
        </div>
      )}

      {/* --- Uploading bytes (local progress) --- */}
      {uploadPct !== null && (
        <div
          className="flex flex-col gap-2 rounded-md bg-surface-sunken px-3 py-3 text-body-sm text-text-secondary"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={uploadPct}
          aria-label={t("lesson.pdf.progressLabel")}
        >
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            {t.rich("lesson.pdf.uploading", {
              percent: formatNumber(uploadPct),
              num: (chunks) => <bdi dir="ltr">{chunks}</bdi>,
            })}
          </span>
          <span
            aria-hidden="true"
            className="block h-2 w-full overflow-hidden rounded-full bg-border"
          >
            <span
              className="block h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${uploadPct}%` }}
            />
          </span>
        </div>
      )}

      {/* --- Validating (server-side check after the bytes landed) --- */}
      {validating && (
        <div className="flex items-start gap-3 rounded-md bg-surface-sunken px-3 py-3">
          <Loader2
            className="mt-0.5 size-5 shrink-0 animate-spin text-warning"
            aria-hidden="true"
          />
          <p className="text-body-sm text-text-secondary">{t("lesson.pdf.validating")}</p>
        </div>
      )}

      {/* --- queued on reload (initiated, never finalized) --- */}
      {status === "queued" && uploadPct === null && !validating && (
        <div className="flex flex-col gap-3 rounded-md bg-surface-sunken px-3 py-3">
          <p className="flex items-start gap-2 text-body-sm text-text-secondary">
            <Loader2 className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
            {t("lesson.pdf.queued")}
          </p>
          {previousNote}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy || !storageConfigured} onClick={handleRetry}>
              {t("lesson.pdf.retry")}
            </Button>
            {previousPdf && (
              <Button type="button" variant="outline" disabled={busy} onClick={handleRestore}>
                {t("lesson.pdf.restorePrevious")}
              </Button>
            )}
            <Button type="button" variant="destructive" disabled={busy} onClick={handleRemove}>
              {t("lesson.pdf.remove")}
            </Button>
          </div>
        </div>
      )}

      {/* --- ready --- */}
      {status === "ready" && (
        <div className="flex flex-col gap-3 rounded-md bg-surface-sunken px-3 py-3">
          <p className="flex items-center gap-2 text-body-sm font-medium text-success">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
            {t("lesson.pdf.ready")}
          </p>
          {nameNode && (
            <p className="flex items-center gap-2 text-body-sm text-text-secondary">
              <FileText className="size-4 shrink-0" aria-hidden="true" />
              <span>
                {nameNode}
                {sizeBytes !== null && (
                  <>
                    {" · "}
                    {t.rich("lesson.pdf.size", {
                      mb: formatMegabytes(sizeBytes),
                      num: (chunks) => <bdi dir="ltr">{chunks}</bdi>,
                    })}
                  </>
                )}
              </span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={uploadDisabled} onClick={openPicker}>
              {t("lesson.pdf.replace")}
            </Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={handleRemove}>
              {t("lesson.pdf.remove")}
            </Button>
          </div>
        </div>
      )}

      {/* --- failed --- */}
      {status === "failed" && (
        <div className="flex flex-col gap-3 rounded-md border border-error/30 bg-error/10 px-3 py-3">
          <p className="flex items-center gap-2 text-body-sm font-semibold text-error">
            <AlertCircle className="size-5 shrink-0" aria-hidden="true" />
            {t("lesson.pdf.failed")}
          </p>
          {nameNode && <p className="text-body-sm text-text-secondary">{nameNode}</p>}
          {errorReason && (
            <p className="text-body-sm text-text-secondary">{reasonText(errorReason)}</p>
          )}
          {previousNote}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={uploadDisabled} onClick={handleRetry}>
              {t("lesson.pdf.retry")}
            </Button>
            <Button type="button" variant="outline" disabled={uploadDisabled} onClick={openPicker}>
              {t("lesson.pdf.chooseAnother")}
            </Button>
            {previousPdf && (
              <Button type="button" variant="outline" disabled={busy} onClick={handleRestore}>
                {t("lesson.pdf.restorePrevious")}
              </Button>
            )}
            <Button type="button" variant="destructive" disabled={busy} onClick={handleRemove}>
              {t("lesson.pdf.remove")}
            </Button>
          </div>
          {!hasRetainedFile && (
            <p className="text-body-sm text-text-secondary">
              {t("lesson.pdf.retryReselectHint")}
            </p>
          )}
        </div>
      )}

      {uploadError && <FormMessage tone="error">{uploadError}</FormMessage>}

      {/* --- description note (AD-4 field-group b) --- */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`lesson-${lessonId}-note`}
          className="text-body-sm font-medium text-text-secondary"
        >
          {t("lesson.pdf.noteLabel")}
        </label>
        <textarea
          id={`lesson-${lessonId}-note`}
          value={note}
          onChange={(event) => handleNoteChange(event.target.value)}
          maxLength={PDF_NOTE_MAX_LENGTH}
          rows={3}
          placeholder={t("lesson.pdf.notePlaceholder")}
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
