"use client";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { MODULE_TITLE_MAX_LENGTH } from "@/lib/modules/course-authoring/course";
import type { OutlineModule } from "@/lib/modules/course-authoring/course";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { LessonRow } from "./lesson-row";

/**
 * One Module in the outline: an inline-editable name, its Lesson rows, and an
 * "Add lesson" action. Story 2.3 adds a drag handle + explicit "Move up / Move
 * down" buttons (AC #1, AC #3) and wraps the lesson list in its own
 * `SortableContext` so a Lesson only ever reorders within this Module (AC #1).
 */
export function ModuleBlock({
  module,
  moduleIndex,
  moduleCount,
  addingLesson,
  addsBusy,
  fieldsDisabled,
  focusId,
  pendingToggle,
  onTitleChange,
  onAddLesson,
  onLessonTitleChange,
  onLessonRequiredChange,
  onMoveModule,
  onMoveLesson,
}: {
  module: OutlineModule;
  moduleIndex: number;
  moduleCount: number;
  addingLesson: boolean;
  addsBusy: boolean;
  fieldsDisabled: boolean;
  focusId: string | null;
  pendingToggle: ReadonlySet<string>;
  onTitleChange: (moduleId: string, title: string) => void;
  onAddLesson: (moduleId: string) => void;
  onLessonTitleChange: (lessonId: string, title: string) => void;
  onLessonRequiredChange: (lessonId: string, required: boolean) => void;
  onMoveModule: (moduleId: string, direction: "up" | "down") => void;
  onMoveLesson: (
    moduleId: string,
    lessonId: string,
    direction: "up" | "down",
  ) => void;
}) {
  const t = useTranslations("Course");
  // A just-added Module is title-only and often still blank when the Instructor
  // tabs to reorder — fall back to the "Untitled module" label rather than
  // rendering "Reorder module: " with a dangling separator.
  const titleForLabel = module.title.trim() || t("outline.untitledModule");

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: module.id,
    data: { type: "module" },
    disabled: fieldsDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const lessonIds = useMemo(
    () => module.lessons.map((lesson) => lesson.id),
    [module.lessons],
  );

  const isFirst = moduleIndex === 0;
  const isLast = moduleIndex === moduleCount - 1;

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-transparent",
        isDragging &&
          "relative z-10 border-border-hairline bg-surface-raised p-3 shadow-md",
      )}
    >
      <div className="flex items-center gap-1">
        <button
          ref={setActivatorNodeRef}
          type="button"
          id={`drag-module-${module.id}`}
          {...attributes}
          {...listeners}
          disabled={fieldsDisabled}
          aria-label={t("outline.reorder.moduleHandleAria", { title: titleForLabel })}
          className="inline-flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-text-disabled hover:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed active:cursor-grabbing"
        >
          <GripVertical className="size-4 rtl:-scale-x-100" aria-hidden="true" />
        </button>
        <Button
          type="button"
          id={`move-module-${module.id}-up`}
          variant="ghost"
          size="icon"
          disabled={fieldsDisabled || isFirst}
          onClick={() => onMoveModule(module.id, "up")}
          aria-label={t("outline.reorder.moveModuleUp", { title: titleForLabel })}
        >
          <ChevronUp className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          id={`move-module-${module.id}-down`}
          variant="ghost"
          size="icon"
          disabled={fieldsDisabled || isLast}
          onClick={() => onMoveModule(module.id, "down")}
          aria-label={t("outline.reorder.moveModuleDown", { title: titleForLabel })}
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </Button>

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
        <SortableContext
          items={lessonIds}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-1 ps-6">
            {module.lessons.map((lesson, lessonIndex) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                moduleId={module.id}
                index={lessonIndex}
                count={module.lessons.length}
                disabled={fieldsDisabled}
                togglePending={pendingToggle.has(lesson.id)}
                autoFocusTitle={focusId === lesson.id}
                onTitleChange={onLessonTitleChange}
                onRequiredChange={onLessonRequiredChange}
                onMove={onMoveLesson}
              />
            ))}
          </ul>
        </SortableContext>
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
