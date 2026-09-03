"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";

import { LESSON_TITLE_MAX_LENGTH } from "@/lib/modules/course-authoring/course";
import type { OutlineLesson } from "@/lib/modules/course-authoring/course";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * One Lesson in the outline: an inline-editable title, a type/status meta label
 * ("Not started" until Stories 2.4–2.8 add the picker), and the AC #6
 * certificate-eligibility toggle. Story 2.3 adds a drag handle (pointer/touch
 * reorder within the Module) and explicit "Move up / Move down" buttons — the
 * full keyboard equivalent (AC #3). Lessons reorder *within their Module only*.
 */
export function LessonRow({
  lesson,
  moduleId,
  index,
  count,
  disabled,
  togglePending = false,
  autoFocusTitle = false,
  onTitleChange,
  onRequiredChange,
  onMove,
}: {
  lesson: OutlineLesson;
  moduleId: string;
  index: number;
  count: number;
  disabled: boolean;
  togglePending?: boolean;
  autoFocusTitle?: boolean;
  onTitleChange: (lessonId: string, title: string) => void;
  onRequiredChange: (lessonId: string, required: boolean) => void;
  onMove: (moduleId: string, lessonId: string, direction: "up" | "down") => void;
}) {
  const t = useTranslations("Course");
  const requiredId = `lesson-${lesson.id}-required`;
  // Fall back to "Untitled lesson" for a still-blank freshly-added row so the
  // reorder controls don't announce "Reorder lesson: " with a dangling colon.
  const titleForLabel = lesson.title.trim() || t("outline.untitledLesson");

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lesson.id,
    data: { type: "lesson", moduleId },
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isFirst = index === 0;
  const isLast = index === count - 1;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-2 rounded-md border border-transparent px-2 py-2 hover:bg-surface-sunken sm:flex-row sm:items-center sm:gap-3",
        isDragging && "relative z-10 border-border-hairline bg-surface-raised shadow-md",
      )}
    >
      <div className="flex items-center gap-1">
        <button
          ref={setActivatorNodeRef}
          type="button"
          id={`drag-lesson-${lesson.id}`}
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={t("outline.reorder.lessonHandleAria", { title: titleForLabel })}
          className="inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-text-disabled hover:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed active:cursor-grabbing"
        >
          <GripVertical className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </button>
        <Button
          type="button"
          id={`move-lesson-${lesson.id}-up`}
          variant="ghost"
          size="icon"
          disabled={disabled || isFirst}
          onClick={() => onMove(moduleId, lesson.id, "up")}
          aria-label={t("outline.reorder.moveLessonUp", { title: titleForLabel })}
        >
          <ChevronUp className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          id={`move-lesson-${lesson.id}-down`}
          variant="ghost"
          size="icon"
          disabled={disabled || isLast}
          onClick={() => onMove(moduleId, lesson.id, "down")}
          aria-label={t("outline.reorder.moveLessonDown", { title: titleForLabel })}
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </Button>
      </div>

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
