import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import type {
  CourseCategory,
  CourseContentLanguage,
  CourseOutline,
  OutlineLesson,
} from "@/lib/modules/course-authoring/course";
import {
  course,
  courseModule,
  lesson,
} from "@/lib/modules/course-authoring/schema";

export type {
  CourseOutline,
  OutlineLesson,
  OutlineModule,
} from "@/lib/modules/course-authoring/course";

/**
 * Course Authoring service layer (AD-1, AD-2, AD-3). This module owns the
 * `course` table, so these functions talk to it with direct Drizzle queries via
 * `lib/db/client`. Anything outside Course Authoring that needs course data
 * calls one of these — never a raw query against `course`.
 *
 * Shape mirrors `lib/modules/accounts/service.ts` (the first populated module
 * service, Story 1.4): plain functions, direct queries, return values / `null`
 * directly. The `{ ok, ... }` discriminated union is the client-boundary
 * (Server Action) convention, not an intra-server read/write concern.
 *
 * Authorization lives in the Server Action (`requireRole`, `isOwner`), never
 * here.
 */

/** Full row as stored. `publishedAt === null` means unpublished / draft. */
export type Course = typeof course.$inferSelect;

/**
 * Hard ceiling on `listCoursesByInstructor` rows — same rationale as the
 * Accounts service's `LIST_ACCOUNTS_LIMIT`: no pagination in v1, but the query
 * stays bounded so "My Courses" can't stream an ever-growing table into the RSC
 * payload.
 */
const LIST_COURSES_LIMIT = 200;

/** Columns "My Courses" actually renders — never the full row. */
const courseListColumns = {
  id: course.id,
  title: course.title,
  category: course.category,
  contentLanguage: course.contentLanguage,
  publishedAt: course.publishedAt,
} as const;

/** Trimmed Course shape for list surfaces. */
export interface CourseListItem {
  id: string;
  title: string;
  category: CourseCategory;
  contentLanguage: CourseContentLanguage;
  publishedAt: Date | null;
}

export interface CreateCourseInput {
  instructorId: string;
  title: string;
  description: string;
  category: CourseCategory;
  contentLanguage: CourseContentLanguage;
}

/**
 * Insert one Course and return the stored row. `id`, `createdAt`, `updatedAt`
 * are filled by the schema defaults; `publishedAt` stays `null` (draft) until
 * Story 2.10's publish flow. Callers pass values already trimmed and validated
 * (the Server Action does this).
 */
export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const [created] = await db
    .insert(course)
    .values({
      instructorId: input.instructorId,
      title: input.title,
      description: input.description,
      category: input.category,
      contentLanguage: input.contentLanguage,
    })
    .returning();

  return created;
}

/**
 * Courses owned by one Instructor, newest first, capped at
 * `LIST_COURSES_LIMIT`. Powers "My Courses" — selects only the columns that
 * surface renders, not the full row.
 */
export async function listCoursesByInstructor(
  instructorId: string,
): Promise<CourseListItem[]> {
  return db
    .select(courseListColumns)
    .from(course)
    .where(eq(course.instructorId, instructorId))
    .orderBy(desc(course.createdAt))
    .limit(LIST_COURSES_LIMIT);
}

/** One Course by id, or `null` when it does not exist. */
export async function getCourseById(courseId: string): Promise<Course | null> {
  const [row] = await db
    .select()
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);

  return row ?? null;
}

// ---------------------------------------------------------------------------
// Outline: Module + Lesson (Story 2.2)
// ---------------------------------------------------------------------------

/** Full rows as stored. `removedAt !== null` means soft-deleted (AD-11). */
export type ModuleRow = typeof courseModule.$inferSelect;
export type LessonRow = typeof lesson.$inferSelect;

/**
 * The nested outline for one Course — non-removed Modules ordered by `position`,
 * each with its non-removed Lessons ordered by `position`. Two queries + an
 * in-memory stitch (not the full rows — only the columns the editor renders).
 * Powers the Story 2.2 outline editor.
 */
export async function getCourseOutline(
  courseId: string,
): Promise<CourseOutline> {
  const modules = await db
    .select({
      id: courseModule.id,
      title: courseModule.title,
      position: courseModule.position,
    })
    .from(courseModule)
    .where(and(eq(courseModule.courseId, courseId), isNull(courseModule.removedAt)))
    .orderBy(asc(courseModule.position));

  if (modules.length === 0) return { modules: [] };

  const moduleIds = modules.map((m) => m.id);
  const lessons = await db
    .select({
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      lessonType: lesson.lessonType,
      required: lesson.required,
      position: lesson.position,
    })
    .from(lesson)
    .where(and(inArray(lesson.moduleId, moduleIds), isNull(lesson.removedAt)))
    .orderBy(asc(lesson.position));

  const lessonsByModule = new Map<string, OutlineLesson[]>();
  for (const m of modules) lessonsByModule.set(m.id, []);
  for (const l of lessons) {
    lessonsByModule.get(l.moduleId)?.push({
      id: l.id,
      title: l.title,
      lessonType: l.lessonType,
      required: l.required,
      position: l.position,
    });
  }

  return {
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      position: m.position,
      lessons: lessonsByModule.get(m.id) ?? [],
    })),
  };
}

/** Postgres unique-violation (SQLSTATE 23505), including drizzle-wrapped ones. */
function isUniquePositionClash(error: unknown): boolean {
  for (let e: unknown = error, hops = 0; e && hops < 4; hops++) {
    if (typeof e === "object" && e !== null) {
      if ((e as { code?: unknown }).code === "23505") return true;
      const message = (e as { message?: unknown }).message;
      if (
        typeof message === "string" &&
        /duplicate key value|unique constraint|_position_uq/i.test(message)
      ) {
        return true;
      }
      e = (e as { cause?: unknown }).cause;
    } else {
      break;
    }
  }
  return false;
}

/**
 * `max(position) + 1` of a parent's live children, evaluated inside the INSERT.
 * The `pg_advisory_xact_lock` in the predicate serialises concurrent appends
 * for the *same* parent (the lock is held for the statement's implicit
 * transaction and released on commit, so the next waiter's `max()` sees the
 * row just inserted); different parents hash to different keys and never
 * block each other. The lock is skipped only when the parent has zero live
 * children (nothing to scan) — that first-insert thundering-herd is caught by
 * the `(parent_id, position)` partial-unique index and `insertAppending`'s
 * retry.
 */
function appendPosition(
  positionCol: typeof courseModule.position | typeof lesson.position,
  table: typeof courseModule | typeof lesson,
  parentCol: typeof courseModule.courseId | typeof lesson.moduleId,
  removedCol: typeof courseModule.removedAt | typeof lesson.removedAt,
  parentId: string,
) {
  return sql`(
    select coalesce(max(${positionCol}), -1) + 1
    from ${table}
    where ${parentCol} = ${parentId}
      and ${removedCol} is null
      and pg_advisory_xact_lock(hashtextextended(${parentId}, 0)) is not null
  )`;
}

/**
 * Insert a freshly-appended row, retrying if the `(parent_id, position)`
 * partial-unique index rejects it (23505) because a concurrent add into an
 * empty parent computed the same starting `position`. Jittered backoff so
 * racers don't lock-step.
 */
async function insertAppending<T>(run: () => Promise<T[]>): Promise<T> {
  const MAX_ATTEMPTS = 15;
  for (let attempt = 1; ; attempt += 1) {
    try {
      const [row] = await run();
      return row;
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS || !isUniquePositionClash(error)) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(attempt * 12, 120) + Math.random() * 25),
      );
    }
  }
}

/**
 * Append a Module to a Course (AC #1). `title` is pre-trimmed/validated by the
 * Server Action. Returns the created row (the client needs its `id`). Story 2.3
 * rewrites sibling positions on drag-reorder.
 */
export async function addModule(input: {
  courseId: string;
  title: string;
}): Promise<ModuleRow> {
  return insertAppending(
    () =>
      db
        .insert(courseModule)
        .values({
          courseId: input.courseId,
          title: input.title,
          position: appendPosition(
            courseModule.position,
            courseModule,
            courseModule.courseId,
            courseModule.removedAt,
            input.courseId,
          ),
        })
        .returning(),
  );
}

/**
 * Append a Lesson to a Module (AC #2). Title-only — `lessonType` stays `null`
 * until Stories 2.4–2.8; `required` defaults to `true` (AD-7).
 */
export async function addLesson(input: {
  moduleId: string;
  title: string;
}): Promise<LessonRow> {
  return insertAppending(
    () =>
      db
        .insert(lesson)
        .values({
          moduleId: input.moduleId,
          title: input.title,
          position: appendPosition(
            lesson.position,
            lesson,
            lesson.moduleId,
            lesson.removedAt,
            input.moduleId,
          ),
        })
        .returning(),
  );
}

/**
 * Autosave write for AD-4 field-group (a) — a Module's outline title.
 * Last-write-wins: a plain `UPDATE` ( `$onUpdate` bumps `updatedAt` ). Returns
 * `null` if the row is gone or already soft-removed.
 */
export async function updateModuleTitle(input: {
  moduleId: string;
  title: string;
}): Promise<ModuleRow | null> {
  const [updated] = await db
    .update(courseModule)
    .set({ title: input.title })
    .where(and(eq(courseModule.id, input.moduleId), isNull(courseModule.removedAt)))
    .returning();

  return updated ?? null;
}

/** Autosave write for AD-4 field-group (a) — a Lesson's outline title. */
export async function updateLessonTitle(input: {
  lessonId: string;
  title: string;
}): Promise<LessonRow | null> {
  const [updated] = await db
    .update(lesson)
    .set({ title: input.title })
    .where(and(eq(lesson.id, input.lessonId), isNull(lesson.removedAt)))
    .returning();

  return updated ?? null;
}

/**
 * The AC #6 certificate-eligibility write. Discrete setting, not debounced text
 * — feeds Epic 4's isCourseComplete() (AD-7).
 */
export async function setLessonRequired(input: {
  lessonId: string;
  required: boolean;
}): Promise<LessonRow | null> {
  const [updated] = await db
    .update(lesson)
    .set({ required: input.required })
    .where(and(eq(lesson.id, input.lessonId), isNull(lesson.removedAt)))
    .returning();

  return updated ?? null;
}

/**
 * Resolve a Module to its owning Course + Instructor so the Server Action can
 * authorize a mutation without a raw cross-table query in `actions.ts`. `null`
 * when the Module does not exist or is soft-removed. One shape, reused by every
 * Module/Lesson action here and in Stories 2.3–2.8.
 */
export interface ModuleCourseContext {
  courseId: string;
  instructorId: string;
}

export async function getModuleCourseContext(
  moduleId: string,
): Promise<ModuleCourseContext | null> {
  const [row] = await db
    .select({ courseId: course.id, instructorId: course.instructorId })
    .from(courseModule)
    .innerJoin(course, eq(courseModule.courseId, course.id))
    .where(and(eq(courseModule.id, moduleId), isNull(courseModule.removedAt)))
    .limit(1);

  return row ?? null;
}

/** Resolve a Lesson to its Module + Course + Instructor (same purpose). */
export interface LessonCourseContext {
  courseId: string;
  moduleId: string;
  instructorId: string;
}

export async function getLessonCourseContext(
  lessonId: string,
): Promise<LessonCourseContext | null> {
  const [row] = await db
    .select({
      courseId: course.id,
      moduleId: courseModule.id,
      instructorId: course.instructorId,
    })
    .from(lesson)
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .innerJoin(course, eq(courseModule.courseId, course.id))
    .where(
      and(
        eq(lesson.id, lessonId),
        isNull(lesson.removedAt),
        isNull(courseModule.removedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}
