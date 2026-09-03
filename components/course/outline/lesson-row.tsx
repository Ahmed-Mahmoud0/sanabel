"use client";

import { useTranslations } from "next-intl";

import { LESSON_TITLE_MAX_LENGTH } from "@/lib/modules/course-authoring/course";
import type { OutlineLesson } from "@/lib/modules/course-authoring/course";
import { Input } from "@/components/ui/input";

/**
 * One Lesson in the outline: an inline-editable title, a type/status meta label
 * ("Not started" until Stories 2.4–2.8 add the picker), and the AC #6
 * certificate-eligibility toggle. No drag handle / reorder control — reordering
 * is entirely Story 2.3.
 */
export function LessonRow({
  lesson,
  disabled,
  togglePending = false,
  autoFocusTitle = false,
  onTitleChange,
  onRequiredChange,
}: {
  lesson: OutlineLesson;
  disabled: boolean;
  togglePending?: boolean;
  autoFocusTitle?: boolean;
  onTitleChange: (lessonId: string, title: string) => void;
  onRequiredChange: (lessonId: string, required: boolean) => void;
}) {
  const t = useTranslations("Course");
  const requiredId = `lesson-${lesson.id}-required`;

  return (
    <li className="flex flex-col gap-2 rounded-md border border-transparent px-2 py-2 hover:bg-surface-sunken sm:flex-row sm:items-center sm:gap-3">
      <Input
        value={lesson.title}
        onChange={(event) => onTitleChange(lesson.id, event.target.value)}
        maxLength={LESSON_TITLE_MAX_LENGTH}
        disabled={disabled}
        autoFocus={autoFocusTitle}
        aria-label={t("outline.lessonTitleAria")}
        placeholder={t("outline.lessonTitlePlaceholder")}
        autoComplete="off"
        className="h-11 flex-1 bg-surface-raised"
      />

      <span className="text-body-sm text-text-secondary">
        {lesson.lessonType
          ? t(`outline.lessonType.${lesson.lessonType}`)
          : t("outline.notStarted")}
      </span>

      <label
        htmlFor={requiredId}
        className="flex items-center gap-2 text-body-sm text-text-secondary"
      >
        <input
          id={requiredId}
          type="checkbox"
          checked={lesson.required}
          disabled={disabled || togglePending}
          onChange={(event) => onRequiredChange(lesson.id, event.target.checked)}
          className="size-4 shrink-0 accent-primary"
        />
        {t("outline.requiredToggle")}
      </label>
    </li>
  );
}
