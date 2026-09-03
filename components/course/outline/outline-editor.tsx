"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";

import type { ActionResult } from "@/lib/actions/result";
import { formatNumber } from "@/lib/i18n/format";
import { Link, useRouter } from "@/lib/i18n/navigation";
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
  reorderLessonsAction,
  reorderModulesAction,
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

type Direction = "up" | "down";

const flip = (direction: Direction): Direction =>
  direction === "up" ? "down" : "up";

const ZERO_WIDTH_SPACE = "​";

/**
 * The course outline editor (Stories 2.2 + 2.3) — grows the course-builder
 * landing route Story 2.1 reserved. Owns the outline state and the shared
 * autosave status; delegates rows to `ModuleBlock` / `LessonRow`.
 *
 * Story 2.3 adds drag + keyboard reorder: one `<DndContext>` (pointer only —
 * the explicit per-row "Move up / Move down" buttons are the AC #3 keyboard
 * equivalent), a type-scoped collision strategy so a module drag never resolves
 * to a lesson row, a `<SortableContext>` for the module list and one per module
 * for its lessons (a Lesson reorders within its Module only), a dedicated
 * `aria-live` announcer, and a snapshot-rollback / `stale_outline`-refresh
 * recovery path.
 *
 * Still out of scope (later Epic 2 stories): per-Lesson-Type authoring + upload
 * (2.4–2.8), working "Preview as learner" (2.9), working "Publish" (2.10).
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
  const router = useRouter();
  const { status, schedule, save, retry } = useOutlineAutosave();

  const [modules, setModules] = useState<OutlineModule[]>(
    initialOutline.modules,
  );
  // Always-fresh mirror of `modules` so a same-task burst of keyboard "Move"
  // presses (or a drop) derives each new order from the previous computed one,
  // not from a stale render closure. The effect keeps it synced after any
  // `modules` change (add / rename / toggle / recovery); the reorder helpers
  // also push it forward synchronously.
  const modulesRef = useRef(modules);
  useEffect(() => {
    modulesRef.current = modules;
  }, [modules]);

  const [addingModule, setAddingModule] = useState(false);
  const [addingLessonFor, setAddingLessonFor] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Announced (aria-live) after every reorder. `n` bumps every call so an
  // identical "Moved to X of Y" string still mutates the DOM text node (React
  // bails on an unchanged value → a screen reader would otherwise stay silent).
  const [moveAnnouncement, setMoveAnnouncement] = useState<{
    text: string;
    n: number;
  }>({ text: "", n: 0 });
  // Element id to focus after a reorder re-renders. A ref, not state: consumed
  // in the effect below without its own render.
  const focusTargetRef = useRef<string | null>(null);
  // Set only by a `stale_outline` failure — the re-sync effect ignores every
  // other `initialOutline` identity change (client nav, a parent re-render,
  // Strict Mode) so it can't silently revert unrelated optimistic state.
  const recoveryPendingRef = useRef(false);
  // Lessons with an in-flight certificate-toggle write — the checkbox is
  // disabled while pending so a second click can't interleave (which would
  // make the optimistic rollback restore the wrong prior value).
  const [pendingToggle, setPendingToggle] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // Id of the Module/Lesson whose title input should take focus on mount —
  // set right after an add so the Instructor can name it immediately (AC #1/#2).
  const [focusId, setFocusId] = useState<string | null>(null);

  const mountedOutline = useRef(initialOutline);
  useEffect(() => {
    if (initialOutline === mountedOutline.current) return;
    mountedOutline.current = initialOutline;
    // Only adopt a server refetch that *we* asked for (the `stale_outline`
    // recovery). Any other cause leaves optimistic state alone.
    if (!recoveryPendingRef.current) return;
    recoveryPendingRef.current = false;
    modulesRef.current = initialOutline.modules;
    setModules(initialOutline.modules);
    setActionError(null);
    setMoveAnnouncement((prev) => ({ text: "", n: prev.n + 1 }));
  }, [initialOutline]);

  useEffect(() => {
    const targetId = focusTargetRef.current;
    if (!targetId) return;
    focusTargetRef.current = null;
    document.getElementById(targetId)?.focus();
  }, [modules]);

  // Pointer only. Keyboard reorder is the explicit Move up/down buttons
  // (localized, focus-managed) — not @dnd-kit's KeyboardSensor, which would add
  // an English-only, double-announcing second path.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // Localized so @dnd-kit's screen-reader instructions / live region are not
  // English on an Arabic page (NFR6). Drag is pointer-only, so these mostly
  // serve the drag-handle's `aria-describedby`.
  const dndAccessibility = useMemo(
    () => ({
      screenReaderInstructions: {
        draggable: t("outline.reorder.dndInstructions"),
      },
      announcements: {
        onDragStart: () => t("outline.reorder.dndPickedUp"),
        onDragOver: () => "",
        onDragEnd: () => t("outline.reorder.dndDropped"),
        onDragCancel: () => t("outline.reorder.dndCancelled"),
      },
    }),
    [t],
  );

  // Scope collisions to the dragged item's own kind (and, for a lesson, its own
  // module) so a tall module drag never resolves `over` to a lesson row — which
  // would make `findIndex` return -1 and the drop silently no-op.
  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    const activeType = args.active.data.current?.type;
    const activeModuleId = args.active.data.current?.moduleId;
    const scoped = args.droppableContainers.filter((container) => {
      const data = container.data.current;
      if (data?.type !== activeType) return false;
      if (activeType === "lesson") return data?.moduleId === activeModuleId;
      return true;
    });
    return closestCenter({ ...args, droppableContainers: scoped });
  }, []);

  const moduleIds = useMemo(() => modules.map((m) => m.id), [modules]);

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

  const announceMove = useCallback(
    (position: number, total: number) => {
      setMoveAnnouncement((prev) => ({
        text: t("outline.reorder.movedAnnouncement", {
          position: formatNumber(position),
          total: formatNumber(total),
        }),
        n: prev.n + 1,
      }));
    },
    [t],
  );

  // Persist a new order. Success drives the header to "Saved." (via `save`).
  // A `stale_outline` failure asks the server for truth (`router.refresh()` →
  // the recovery effect re-syncs); every other failure rolls the optimistic
  // move back to `snapshot` and shows an inline message. Either way focus
  // returns to `refocusId` after the re-render.
  const persistOrder = useCallback(
    (
      fieldKey: string,
      run: () => Promise<ActionResult<null>>,
      snapshot: OutlineModule[],
      refocusId?: string,
    ) => {
      setActionError(null);
      save(fieldKey, async () => {
        let result: ActionResult<null>;
        try {
          result = await run();
        } catch {
          result = { ok: false, error: { code: "unknown", message: "threw" } };
        }
        if (result.ok) {
          setActionError(null);
          return true;
        }
        if (refocusId) focusTargetRef.current = refocusId;
        if (result.error.code === "stale_outline") {
          setActionError(t("outline.reorder.staleOutline"));
          recoveryPendingRef.current = true;
          router.refresh();
        } else {
          setActionError(t("outline.reorder.error"));
          modulesRef.current = snapshot;
          setModules(snapshot);
        }
        return false;
      });
    },
    [router, save, t],
  );

  const commitModuleOrder = useCallback(
    (
      next: OutlineModule[],
      snapshot: OutlineModule[],
      movedIndex: number,
      refocusId?: string,
    ) => {
      modulesRef.current = next;
      setModules(next);
      announceMove(movedIndex + 1, next.length);
      if (refocusId) focusTargetRef.current = refocusId;
      persistOrder(
        `modules:${courseId}`,
        () => reorderModulesAction(courseId, next.map((m) => m.id)),
        snapshot,
        refocusId,
      );
    },
    [announceMove, courseId, persistOrder],
  );

  const commitLessonOrder = useCallback(
    (
      moduleId: string,
      nextLessons: OutlineModule["lessons"],
      snapshot: OutlineModule[],
      movedIndex: number,
      refocusId?: string,
    ) => {
      const next = modulesRef.current.map((m) =>
        m.id === moduleId ? { ...m, lessons: nextLessons } : m,
      );
      modulesRef.current = next;
      setModules(next);
      announceMove(movedIndex + 1, nextLessons.length);
      if (refocusId) focusTargetRef.current = refocusId;
      persistOrder(
        `lessons:${moduleId}`,
        () => reorderLessonsAction(moduleId, nextLessons.map((l) => l.id)),
        snapshot,
        refocusId,
      );
    },
    [announceMove, persistOrder],
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const type = active.data.current?.type;
    const current = modulesRef.current;

    if (type === "module") {
      const oldIndex = current.findIndex((m) => m.id === active.id);
      const newIndex = current.findIndex((m) => m.id === over.id);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      commitModuleOrder(
        arrayMove(current, oldIndex, newIndex),
        current,
        newIndex,
        `drag-module-${String(active.id)}`,
      );
      return;
    }

    if (type === "lesson") {
      const moduleId = active.data.current?.moduleId as string | undefined;
      const overModuleId = over.data.current?.moduleId as string | undefined;
      // Within-module only (AC #1) — a drop over another module is ignored.
      if (!moduleId || overModuleId !== moduleId) return;
      const owning = current.find((m) => m.id === moduleId);
      if (!owning) return;
      const oldIndex = owning.lessons.findIndex((l) => l.id === active.id);
      const newIndex = owning.lessons.findIndex((l) => l.id === over.id);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      commitLessonOrder(
        moduleId,
        arrayMove(owning.lessons, oldIndex, newIndex),
        current,
        newIndex,
        `drag-lesson-${String(active.id)}`,
      );
    }
  }

  function handleMoveModule(moduleId: string, direction: Direction) {
    const current = modulesRef.current;
    const index = current.findIndex((m) => m.id === moduleId);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= current.length) return;
    // Keep focus on the pressed button if it stays enabled; otherwise the
    // opposite one (the item just left an end, so the other direction is live).
    const staysEnabled =
      direction === "up" ? target > 0 : target < current.length - 1;
    const refocusId = `move-module-${moduleId}-${
      staysEnabled ? direction : flip(direction)
    }`;
    commitModuleOrder(
      arrayMove(current, index, target),
      current,
      target,
      refocusId,
    );
  }

  function handleMoveLesson(
    moduleId: string,
    lessonId: string,
    direction: Direction,
  ) {
    const current = modulesRef.current;
    const owning = current.find((m) => m.id === moduleId);
    if (!owning) return;
    const index = owning.lessons.findIndex((l) => l.id === lessonId);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= owning.lessons.length) return;
    const staysEnabled =
      direction === "up" ? target > 0 : target < owning.lessons.length - 1;
    const refocusId = `move-lesson-${lessonId}-${
      staysEnabled ? direction : flip(direction)
    }`;
    commitLessonOrder(
      moduleId,
      arrayMove(owning.lessons, index, target),
      current,
      target,
      refocusId,
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

      {/* Dedicated reorder announcer — kept separate from the autosave-status
          live region so the two don't clobber each other (UX-DR11). The
          trailing zero-width space (U+200B) toggles by parity so an identical
          "Moved to X of Y" still mutates the text node and re-announces. */}
      <div role="status" aria-live="polite" className="sr-only">
        {moveAnnouncement.text
          ? moveAnnouncement.text +
            (moveAnnouncement.n % 2 === 0 ? "" : ZERO_WIDTH_SPACE)
          : ""}
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
        <DndContext
          sensors={sensors}
          accessibility={dndAccessibility}
          collisionDetection={collisionDetectionStrategy}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <div className="mt-6 flex flex-col gap-8">
            <SortableContext
              items={moduleIds}
              strategy={verticalListSortingStrategy}
            >
              {modules.map((module, moduleIndex) => (
                <ModuleBlock
                  key={module.id}
                  module={module}
                  moduleIndex={moduleIndex}
                  moduleCount={modules.length}
                  addingLesson={addingLessonFor === module.id}
                  addsBusy={addsBusy}
                  fieldsDisabled={false}
                  focusId={focusId}
                  pendingToggle={pendingToggle}
                  onTitleChange={handleModuleTitleChange}
                  onAddLesson={handleAddLesson}
                  onLessonTitleChange={handleLessonTitleChange}
                  onLessonRequiredChange={handleLessonRequiredChange}
                  onMoveModule={handleMoveModule}
                  onMoveLesson={handleMoveLesson}
                />
              ))}
            </SortableContext>

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
        </DndContext>
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
