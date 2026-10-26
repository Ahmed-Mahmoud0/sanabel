"use client";

import { useTranslations } from "next-intl";

import type { LessonType } from "@/lib/modules/course-authoring/course";

/**
 * Shown for a Lesson whose type is PDF, Quiz or Code Exercise — Stories
 * 2.6–2.8 replace this with the real editor. Keeps the type picker honest: all
 * five choices commit, Video and Text are authored.
 */
export function LessonContentPlaceholder({
  lessonType,
}: {
  lessonType: Exclude<LessonType, "video" | "text">;
}) {
  const t = useTranslations("Course");

  return (
    <div className="mt-6 rounded-lg border border-border-hairline bg-surface-raised p-6">
      <p className="text-body-sm text-text-secondary">
        {t("lesson.placeholder.comingSoon", {
          type: t(`outline.lessonType.${lessonType}`),
        })}
      </p>
    </div>
  );
}
