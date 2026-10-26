"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import type {
  CourseContentLanguage,
  LessonType,
} from "@/lib/modules/course-authoring/course";
import type { TextDoc } from "@/lib/modules/course-authoring/text-body";
import { Badge } from "@/components/ui/badge";
import { AutosaveIndicator } from "@/components/course/outline/autosave-indicator";
import { useOutlineAutosave } from "@/components/course/outline/use-outline-autosave";

import { LessonContentPlaceholder } from "./lesson-content-placeholder";
import { LessonTypePicker } from "./lesson-type-picker";
import { TextLessonPanel } from "./text-lesson-panel";
import { VideoLessonPanel, type InitialVideoMedia } from "./video-lesson-panel";

/**
 * The per-Lesson authoring page (Story 2.4). Owns the shared autosave status
 * (AD-4 — field-group (b), the content body, autosaves here independently of
 * the outline editor's field-group (a) title/order). Renders the type picker
 * while `lessonType` is unset, then the type-specific panel — Video (2.4) and
 * Text (2.5) are authored; the other three are placeholders until 2.6–2.8.
 */
export function LessonEditor({
  courseId,
  courseTitle,
  lessonId,
  lessonTitle,
  lessonType: initialType,
  contentLanguage,
  initialNote,
  initialDoc,
  initialMedia,
  streamConfigured,
}: {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  lessonType: LessonType | null;
  contentLanguage: CourseContentLanguage;
  initialNote: string;
  initialDoc: TextDoc | null;
  initialMedia: InitialVideoMedia | null;
  streamConfigured: boolean;
}) {
  const t = useTranslations("Course");
  const { status, schedule, flush, retry } = useOutlineAutosave();
  const [lessonType, setLessonType] = useState<LessonType | null>(initialType);

  // A tab close / reload mid-edit can't be rescued (Server Actions can't ride
  // `sendBeacon`), so warn while an edit is unsaved or failed to save.
  const unsaved = status === "editing" || status === "saving" || status === "error";
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  const displayTitle = lessonTitle.trim() || t("outline.untitledLesson");

  return (
    <main className="mx-auto w-full max-w-3xl px-gutter py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-hairline pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/courses"
            className="text-body-sm text-text-secondary underline-offset-4 hover:underline"
          >
            {t("outline.breadcrumb")}
          </Link>
          <span aria-hidden="true" className="text-text-disabled">
            /
          </span>
          <Link
            href={`/courses/${courseId}`}
            className="text-body-sm text-text-secondary underline-offset-4 hover:underline"
          >
            {courseTitle}
          </Link>
          <span aria-hidden="true" className="text-text-disabled">
            /
          </span>
          <h1 className="text-heading-md text-text-primary">{displayTitle}</h1>
          <Badge variant="secondary">{t("outline.instructorBadge")}</Badge>
        </div>

        <AutosaveIndicator
          status={status}
          editingText={t("outline.status.editing")}
          savedText={t("outline.status.saved")}
          errorText={t("outline.status.error")}
          retryText={t("outline.status.retry")}
          onRetry={retry}
        />
      </header>

      {lessonType === null ? (
        <LessonTypePicker lessonId={lessonId} onPicked={setLessonType} />
      ) : lessonType === "video" ? (
        <VideoLessonPanel
          lessonId={lessonId}
          initialMedia={initialMedia}
          initialNote={initialNote}
          streamConfigured={streamConfigured}
          scheduleSave={schedule}
        />
      ) : lessonType === "text" ? (
        <TextLessonPanel
          lessonId={lessonId}
          contentLanguage={contentLanguage}
          initialDoc={initialDoc}
          scheduleSave={schedule}
          flushSave={flush}
        />
      ) : (
        <LessonContentPlaceholder lessonType={lessonType} />
      )}
    </main>
  );
}
