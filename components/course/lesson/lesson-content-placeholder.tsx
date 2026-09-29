"use client";

import { useTranslations } from "next-intl";

import type { LessonType } from "@/lib/modules/course-authoring/course";

/**
 * Shown for a Lesson whose type is set to one of the four non-Video types —
 * Stories 2.5–2.8 replace this with the real editor. Keeps Story 2.4's type
 * picker honest: all five choices commit, only Video is authored here.
 */
export function LessonContentPlaceholder({
  lessonType,
}: {
  lessonType: Exclude<LessonType, "video">;
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
