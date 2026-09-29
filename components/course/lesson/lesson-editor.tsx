"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import type { LessonType } from "@/lib/modules/course-authoring/course";
import { Badge } from "@/components/ui/badge";
import { AutosaveIndicator } from "@/components/course/outline/autosave-indicator";
import { useOutlineAutosave } from "@/components/course/outline/use-outline-autosave";

import { LessonContentPlaceholder } from "./lesson-content-placeholder";
import { LessonTypePicker } from "./lesson-type-picker";
import { VideoLessonPanel, type InitialVideoMedia } from "./video-lesson-panel";

/**
 * The per-Lesson authoring page (Story 2.4). Owns the shared autosave status
 * (AD-4 — field-group (b), the content body, autosaves here independently of
 * the outline editor's field-group (a) title/order). Renders the type picker
 * while `lessonType` is unset, then the type-specific panel — Video is built
 * here, the other four are placeholders until Stories 2.5–2.8.
 */
export function LessonEditor({
  courseId,
  courseTitle,
  lessonId,
  lessonTitle,
  lessonType: initialType,
  initialNote,
  initialMedia,
  streamConfigured,
}: {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  lessonType: LessonType | null;
  initialNote: string;
  initialMedia: InitialVideoMedia | null;
  streamConfigured: boolean;
}) {
  const t = useTranslations("Course");
  const { status, schedule, retry } = useOutlineAutosave();
  const [lessonType, setLessonType] = useState<LessonType | null>(initialType);

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
      ) : (
        <LessonContentPlaceholder lessonType={lessonType} />
      )}
    </main>
  );
}
