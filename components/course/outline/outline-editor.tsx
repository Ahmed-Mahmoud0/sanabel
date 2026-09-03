"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";
import type {
  CourseCategory,
  CourseContentLanguage,
  CourseOutline,
  OutlineModule,
} from "@/lib/modules/course-authoring/course";
import {
  addLessonAction,
  addModuleAction,
  renameLessonAction,
  renameModuleAction,
  setLessonRequiredAction,
} from "@/lib/modules/course-authoring/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CourseMetaBadges } from "@/components/course/course-meta-badges";
import { FormMessage } from "@/components/auth/form-message";

import { ModuleBlock } from "./module-block";
import {
  useOutlineAutosave,
  type OutlineSaveStatus,
} from "./use-outline-autosave";

/**
 * The course outline editor (Story 2.2) — grows the course-builder landing
 * route Story 2.1 reserved. Owns the outline state and the shared autosave
 * status; delegates rows to `ModuleBlock` / `LessonRow`.
 *
 * Out of scope here (later Epic 2 stories): drag/keyboard reordering (2.3),
 * per-Lesson-Type authoring + upload (2.4–2.8), working "Preview as learner"
 * (2.9), working "Publish" (2.10). Those two buttons render disabled so the
 * header matches the mockup.
 */
export function OutlineEditor({
  courseId,
  courseTitle,
  category,
  contentLanguage,
  isDraft,
  initialOutline,
}: {
  courseId: string;
  courseTitle: string;
  category: CourseCategory;
  contentLanguage: CourseContentLanguage;
  isDraft: boolean;
  initialOutline: CourseOutline;
}) {
  const t = useTranslations("Course");
  const { status, schedule, retry } = useOutlineAutosave();

  const [modules, setModules] = useState<OutlineModule[]>(
    initialOutline.modules,
  );
  const [addingModule, setAddingModule] = useState(false);
  const [addingLessonFor, setAddingLessonFor] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Lessons with an in-flight certificate-toggle write — the checkbox is
  // disabled while pending so a second click can't interleave (which would
  // make the optimistic rollback restore the wrong prior value).
  const [pendingToggle, setPendingToggle] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // Id of the Module/Lesson whose title input should take focus on mount —
  // set right after an add so the Instructor can name it immediately (AC #1/#2).
  const [focusId, setFocusId] = useState<string | null>(null);

  // Any add in flight: every "Add module" / "Add lesson" button is disabled
  // (not just the one being added) so a click on another can't silently no-op
  // against the single-add guard below.
  const addsBusy = addingModule || addingLessonFor !== null;

  function patchLesson(
    lessonId: string,
    patch: (lesson: OutlineModule["lessons"][number]) => OutlineModule["lessons"][number],
  ) {
    setModules((current) =>
      current.map((m) => ({
        ...m,
        lessons: m.lessons.map((l) => (l.id === lessonId ? patch(l) : l)),
      })),
    );
  }

  async function handleAddModule() {
    if (addsBusy) return;
    setAddingModule(true);
    setActionError(null);
    try {
      const result = await addModuleAction(courseId, t("outline.untitledModule"));
      if (!result.ok) {
        setActionError(t("outline.addError"));
        return;
      }
      setModules((current) => [...current, result.data.module]);
      setFocusId(result.data.module.id);
    } catch {
      setActionError(t("outline.addError"));
    } finally {
      setAddingModule(false);
    }
  }

  async function handleAddLesson(moduleId: string) {
    if (addsBusy) return;
    setAddingLessonFor(moduleId);
    setActionError(null);
    try {
      const result = await addLessonAction(moduleId, t("outline.untitledLesson"));
      if (!result.ok) {
        setActionError(t("outline.addError"));
        return;
      }
      setModules((current) =>
        current.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: [...m.lessons, result.data.lesson] }
            : m,
        ),
      );
      setFocusId(result.data.lesson.id);
    } catch {
      setActionError(t("outline.addError"));
    } finally {
      setAddingLessonFor(null);
    }
  }

  function handleModuleTitleChange(moduleId: string, title: string) {
    setModules((current) =>
      current.map((m) => (m.id === moduleId ? { ...m, title } : m)),
    );
    // Only persist a non-empty title. An empty field is a transient editing
    // state, not something to push to the server (which would reject it and
    // strand the autosave indicator in an unrecoverable error). Any earlier
    // valid value already queued for this field still flushes.
    if (title.trim() !== "") {
      schedule(
        `module:${moduleId}`,
        async () => (await renameModuleAction(moduleId, title)).ok,
      );
    }
  }

  function handleLessonTitleChange(lessonId: string, title: string) {
    patchLesson(lessonId, (l) => ({ ...l, title }));
    if (title.trim() !== "") {
      schedule(
        `lesson:${lessonId}`,
        async () => (await renameLessonAction(lessonId, title)).ok,
      );
    }
  }

  async function handleLessonRequiredChange(
    lessonId: string,
    required: boolean,
  ) {
    if (pendingToggle.has(lessonId)) return;
    setPendingToggle((current) => new Set(current).add(lessonId));
    patchLesson(lessonId, (l) => ({ ...l, required }));
    setActionError(null);
    try {
      const result = await setLessonRequiredAction(lessonId, required);
      if (!result.ok) throw new Error(result.error.code);
    } catch {
      // Safe: the checkbox was disabled for the whole request, so `!required`
      // is guaranteed to be the value shown before this click.
      patchLesson(lessonId, (l) => ({ ...l, required: !required }));
      setActionError(t("outline.toggleError"));
    } finally {
      setPendingToggle((current) => {
        const next = new Set(current);
        next.delete(lessonId);
        return next;
      });
    }
  }

  const isEmpty = modules.length === 0;

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
          <h1 className="text-heading-md text-text-primary">{courseTitle}</h1>
          <Badge variant="secondary">{t("outline.instructorBadge")}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AutosaveIndicator
            status={status}
            editingText={t("outline.status.editing")}
            savedText={t("outline.status.saved")}
            errorText={t("outline.status.error")}
            retryText={t("outline.status.retry")}
            onRetry={retry}
          />
          <Button
            type="button"
            variant="outline"
            disabled
            title={t("outline.comingSoon")}
          >
            {t("outline.previewAsLearner")}
          </Button>
          <Button type="button" disabled title={t("outline.comingSoon")}>
            {t("outline.publish")}
          </Button>
        </div>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <CourseMetaBadges
          category={category}
          contentLanguage={contentLanguage}
          draftLabel={isDraft ? t("builder.draftBadge") : undefined}
        />
      </div>

      {actionError && (
        <div className="mt-4">
          <FormMessage tone="error">{actionError}</FormMessage>
        </div>
      )}

      {isEmpty ? (
        <div className="mt-8 rounded-lg border border-border-hairline bg-surface-raised p-6">
          <h2 className="text-heading-md text-text-primary">
            {t("outline.emptyTitle")}
          </h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            {t("outline.emptyBody")}
          </p>
          <Button
            type="button"
            className="mt-4"
            disabled={addsBusy}
            onClick={handleAddModule}
          >
            {addingModule ? t("outline.adding") : t("outline.addFirstModule")}
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {modules.map((module) => (
            <ModuleBlock
              key={module.id}
              module={module}
              addingLesson={addingLessonFor === module.id}
              addsBusy={addsBusy}
              fieldsDisabled={false}
              focusId={focusId}
              pendingToggle={pendingToggle}
              onTitleChange={handleModuleTitleChange}
              onAddLesson={handleAddLesson}
              onLessonTitleChange={handleLessonTitleChange}
              onLessonRequiredChange={handleLessonRequiredChange}
            />
          ))}

          <div>
            <Button
              type="button"
              variant="outline"
              disabled={addsBusy}
              onClick={handleAddModule}
            >
              {addingModule ? t("outline.adding") : t("outline.addModule")}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

function AutosaveIndicator({
  status,
  editingText,
  savedText,
  errorText,
  retryText,
  onRetry,
}: {
  status: OutlineSaveStatus;
  editingText: string;
  savedText: string;
  errorText: string;
  retryText: string;
  onRetry: () => void;
}) {
  const text =
    status === "editing" || status === "saving"
      ? editingText
      : status === "saved"
        ? savedText
        : status === "error"
          ? errorText
          : "";

  return (
    <div className="flex items-center gap-2 text-body-sm text-text-secondary">
      <span role="status" aria-live="polite">
        {text}
      </span>
      {status === "error" && (
        <button
          type="button"
          onClick={onRetry}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {retryText}
        </button>
      )}
    </div>
  );
}
