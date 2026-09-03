"use client";

import { useTranslations } from "next-intl";

import { MODULE_TITLE_MAX_LENGTH } from "@/lib/modules/course-authoring/course";
import type { OutlineModule } from "@/lib/modules/course-authoring/course";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { LessonRow } from "./lesson-row";

/**
 * One Module in the outline: an inline-editable name, its Lesson rows, and an
 * "Add lesson" action. No drag handle — reordering is Story 2.3.
 */
export function ModuleBlock({
  module,
  addingLesson,
  addsBusy,
  fieldsDisabled,
  focusId,
  pendingToggle,
  onTitleChange,
  onAddLesson,
  onLessonTitleChange,
  onLessonRequiredChange,
}: {
  module: OutlineModule;
  addingLesson: boolean;
  addsBusy: boolean;
  fieldsDisabled: boolean;
  focusId: string | null;
  pendingToggle: ReadonlySet<string>;
  onTitleChange: (moduleId: string, title: string) => void;
  onAddLesson: (moduleId: string) => void;
  onLessonTitleChange: (lessonId: string, title: string) => void;
  onLessonRequiredChange: (lessonId: string, required: boolean) => void;
}) {
  const t = useTranslations("Course");

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Input
          value={module.title}
          onChange={(event) => onTitleChange(module.id, event.target.value)}
          maxLength={MODULE_TITLE_MAX_LENGTH}
          disabled={fieldsDisabled}
          autoFocus={focusId === module.id}
          aria-label={t("outline.moduleTitleAria")}
          placeholder={t("outline.moduleTitlePlaceholder")}
          autoComplete="off"
          className="h-11 flex-1 bg-surface-raised text-heading-md font-semibold"
        />
      </div>

      {module.lessons.length > 0 && (
        <ul className="flex flex-col gap-1 ps-6">
          {module.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              disabled={fieldsDisabled}
              togglePending={pendingToggle.has(lesson.id)}
              autoFocusTitle={focusId === lesson.id}
              onTitleChange={onLessonTitleChange}
              onRequiredChange={onLessonRequiredChange}
            />
          ))}
        </ul>
      )}

      <div className="ps-6">
        <Button
          type="button"
          variant="outline"
          disabled={addsBusy || fieldsDisabled}
          onClick={() => onAddLesson(module.id)}
        >
          {addingLesson ? t("outline.adding") : t("outline.addLesson")}
        </Button>
      </div>
    </section>
  );
}
