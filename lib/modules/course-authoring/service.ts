import { and, asc, desc, eq, inArray, isNull, ne, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db/client";
import type {
  CourseCategory,
  CourseContentLanguage,
  CourseOutline,
  LessonType,
  OutlineLesson,
} from "@/lib/modules/course-authoring/course";
import {
  effectiveMediaStatus,
  type LessonContentBody,
  type LessonMediaStatus,
} from "@/lib/modules/course-authoring/media";
import {
  course,
  courseModule,
  lesson,
  lessonMedia,
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

  // Story 2.4 — the live media record's status per Lesson (Video upload
  // lifecycle). One extra projected query; excludes soft-removed media.
  const lessonIds = lessons.map((l) => l.id);
  const media =
    lessonIds.length === 0
      ? []
      : await db
          .select({
            lessonId: lessonMedia.lessonId,
            status: lessonMedia.status,
            errorReason: lessonMedia.errorReason,
            updatedAt: lessonMedia.updatedAt,
          })
          .from(lessonMedia)
          .where(
            and(
              inArray(lessonMedia.lessonId, lessonIds),
              isNull(lessonMedia.removedAt),
            ),
          );
  const statusByLesson = new Map<string, LessonMediaStatus>();
  for (const row of media) {
    statusByLesson.set(
      row.lessonId,
      effectiveMediaStatus(row.status, row.errorReason, row.updatedAt).status,
    );
  }

  const lessonsByModule = new Map<string, OutlineLesson[]>();
  for (const m of modules) lessonsByModule.set(m.id, []);
  for (const l of lessons) {
    const status = statusByLesson.get(l.id);
    lessonsByModule.get(l.moduleId)?.push({
      id: l.id,
      title: l.title,
      lessonType: l.lessonType,
      required: l.required,
      position: l.position,
      media: status ? { status } : null,
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

// ---------------------------------------------------------------------------
// Outline: drag / keyboard reorder (Story 2.3)
// ---------------------------------------------------------------------------

/**
 * Reorder outcome. `mismatch` means the ids the client sent are not a
 * permutation of the parent's current live children (a stale tab, a concurrent
 * add/remove, or a crafted payload) — nothing is written and the action maps
 * this to `stale_outline` so the client re-syncs from a fresh `getCourseOutline`.
 */
export type ReorderResult = { ok: true } | { ok: false; reason: "mismatch" };

/** `b` is a duplicate-free reordering of exactly the members of `a`. */
function isPermutation(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const seen = new Set(a);
  if (seen.size !== a.length) return false;
  const dedupeB = new Set(b);
  if (dedupeB.size !== b.length) return false;
  for (const id of b) {
    if (!seen.has(id)) return false;
  }
  return true;
}

/**
 * Story 2.2's `(parent_id, position)` partial-unique index rejects any
 * intermediate duplicate, and this Neon Postgres checks that index per-row
 * during a multi-row UPDATE (a single `UPDATE ... SET position = CASE ... END`
 * that permutes the live range trips 23505). `neon-http` also has no
 * interactive transaction. So the rewrite is **two statements in one atomic
 * `db.batch`**:
 *
 *   1. shove every affected row's `position` up by `POSITION_REWRITE_OFFSET`,
 *      vacating the `[0, n)` range;
 *   2. `CASE`-map each row from that parked range down to its final `[0, n)`
 *      slot — every target is now unoccupied, so no per-row collision, whatever
 *      order Postgres processes the rows in.
 *
 * `db.batch` sends both as one Neon transaction over HTTP (all-or-nothing).
 * Drizzle's `$onUpdate` bumps `updated_at` on every row each statement touches
 * (all live siblings).
 */
const POSITION_REWRITE_OFFSET = 1_000_000;

/**
 * The `[0, n)` assignment as one SQL `CASE`: `case <id> when <id0> then 0 ...
 * else <position> end`. `orderedIds` is always the full live sibling set (the
 * permutation check guarantees it), so the `else` branch is unreachable.
 */
function positionCaseExpr(
  idCol: typeof courseModule.id | typeof lesson.id,
  positionCol: typeof courseModule.position | typeof lesson.position,
  orderedIds: string[],
): SQL {
  return sql`case ${idCol} ${sql.join(
    orderedIds.map((id, index) => sql`when ${id} then ${index}`),
    sql` `,
  )} else ${positionCol} end`;
}

/**
 * Run the two-phase rewrite as one atomic `db.batch`. A `23505` here means a
 * concurrent `addModule`/`addLesson` (or soft-remove) landed between this
 * function's `live` read and the batch, leaving a sibling outside the scoped id
 * set whose `position` collides with a phase-2 target — same staleness signal
 * as a permutation mismatch, so the client re-syncs rather than seeing a
 * generic "unknown" error.
 */
async function runReorderBatch(
  statements: Parameters<typeof db.batch>[0],
): Promise<ReorderResult> {
  try {
    await db.batch(statements);
    return { ok: true };
  } catch (error) {
    if (isUniquePositionClash(error)) return { ok: false, reason: "mismatch" };
    throw error;
  }
}

/**
 * Reorder a Course's non-removed Modules to `orderedModuleIds` (AC #1). Returns
 * `mismatch` (writing nothing) when `orderedModuleIds` is not a dup-free
 * permutation of the course's current live module id set, or when a concurrent
 * structural change makes the batch collide.
 */
export async function reorderModules(input: {
  courseId: string;
  orderedModuleIds: string[];
}): Promise<ReorderResult> {
  const { courseId, orderedModuleIds } = input;

  const live = await db
    .select({ id: courseModule.id })
    .from(courseModule)
    .where(
      and(eq(courseModule.courseId, courseId), isNull(courseModule.removedAt)),
    );

  if (!isPermutation(live.map((r) => r.id), orderedModuleIds)) {
    return { ok: false, reason: "mismatch" };
  }
  if (orderedModuleIds.length === 0) return { ok: true };

  const scope = and(
    eq(courseModule.courseId, courseId),
    inArray(courseModule.id, orderedModuleIds),
    isNull(courseModule.removedAt),
  );

  return runReorderBatch([
    db
      .update(courseModule)
      .set({ position: sql`${courseModule.position} + ${POSITION_REWRITE_OFFSET}` })
      .where(scope),
    db
      .update(courseModule)
      .set({
        position: positionCaseExpr(
          courseModule.id,
          courseModule.position,
          orderedModuleIds,
        ),
      })
      .where(scope),
  ]);
}

/**
 * Reorder one Module's non-removed Lessons to `orderedLessonIds` (AC #1).
 * Lessons only ever reorder *within* their Module — there is no cross-module
 * move in this story, so `moduleId` is fixed and the id set is validated
 * against that one Module's live lessons.
 */
export async function reorderLessons(input: {
  moduleId: string;
  orderedLessonIds: string[];
}): Promise<ReorderResult> {
  const { moduleId, orderedLessonIds } = input;

  const live = await db
    .select({ id: lesson.id })
    .from(lesson)
    .where(and(eq(lesson.moduleId, moduleId), isNull(lesson.removedAt)));

  if (!isPermutation(live.map((r) => r.id), orderedLessonIds)) {
    return { ok: false, reason: "mismatch" };
  }
  if (orderedLessonIds.length === 0) return { ok: true };

  const scope = and(
    eq(lesson.moduleId, moduleId),
    inArray(lesson.id, orderedLessonIds),
    isNull(lesson.removedAt),
  );

  return runReorderBatch([
    db
      .update(lesson)
      .set({ position: sql`${lesson.position} + ${POSITION_REWRITE_OFFSET}` })
      .where(scope),
    db
      .update(lesson)
      .set({
        position: positionCaseExpr(lesson.id, lesson.position, orderedLessonIds),
      })
      .where(scope),
  ]);
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

// ---------------------------------------------------------------------------
// Lesson content: type pick, content-body autosave, Video media (Story 2.4)
// ---------------------------------------------------------------------------

/** Full `lesson_media` row as stored. `removedAt !== null` means soft-deleted. */
export type LessonMediaRow = typeof lessonMedia.$inferSelect;

export interface LessonEditorData {
  lesson: {
    id: string;
    title: string;
    lessonType: LessonType | null;
    contentBody: LessonContentBody | null;
  };
  moduleId: string;
  courseId: string;
  courseTitle: string;
  instructorId: string;
  media: LessonMediaRow | null;
}

/**
 * Everything the lesson editor page and the upload-initiation Route Handler
 * need in one call: the Lesson's editable fields, its owning Course/Instructor
 * (for the AD-6 ownership check), and its live media record. `null` when the
 * Lesson is gone or soft-removed.
 */
export async function getLessonEditorData(
  lessonId: string,
): Promise<LessonEditorData | null> {
  const [row] = await db
    .select({
      lessonId: lesson.id,
      title: lesson.title,
      lessonType: lesson.lessonType,
      contentBody: lesson.contentBody,
      moduleId: courseModule.id,
      courseId: course.id,
      courseTitle: course.title,
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

  if (!row) return null;

  const [media] = await db
    .select()
    .from(lessonMedia)
    .where(
      and(eq(lessonMedia.lessonId, lessonId), isNull(lessonMedia.removedAt)),
    )
    .limit(1);

  return {
    lesson: {
      id: row.lessonId,
      title: row.title,
      lessonType: row.lessonType,
      contentBody: (row.contentBody as LessonContentBody | null) ?? null,
    },
    moduleId: row.moduleId,
    courseId: row.courseId,
    courseTitle: row.courseTitle,
    instructorId: row.instructorId,
    media: media ?? null,
  };
}

/**
 * AD-4 field-group (a) — set a Lesson's type **only when it is currently
 * `null`** (the first choice). Switching an already-set type is out of scope
 * for Story 2.4. Returns the updated row, or `null` when nothing matched
 * (already typed, or gone).
 */
export async function setLessonType(input: {
  lessonId: string;
  lessonType: LessonType;
}): Promise<LessonRow | null> {
  const [updated] = await db
    .update(lesson)
    .set({ lessonType: input.lessonType })
    .where(
      and(
        eq(lesson.id, input.lessonId),
        isNull(lesson.lessonType),
        isNull(lesson.removedAt),
      ),
    )
    .returning();

  return updated ?? null;
}

/**
 * AD-4 field-group (b) autosave write — the Lesson's content body. Plain
 * `UPDATE … SET content_body = $1` (`$onUpdate` bumps `updatedAt`),
 * last-write-wins. `contentBody` is pre-validated by the action via
 * `parseLessonContentBody`.
 */
export async function updateLessonContent(input: {
  lessonId: string;
  contentBody: LessonContentBody;
}): Promise<LessonRow | null> {
  const [updated] = await db
    .update(lesson)
    .set({ contentBody: input.contentBody })
    .where(and(eq(lesson.id, input.lessonId), isNull(lesson.removedAt)))
    .returning();

  return updated ?? null;
}

/**
 * Thrown by `upsertVideoMediaForUpload` when a concurrent initiation for the
 * same Lesson won the `lesson_media_lesson_id_uq` race. The route maps it to a
 * 409 and releases the just-minted Cloudflare upload.
 */
export class MediaConflictError extends Error {
  constructor() {
    super("a live media record already exists for this lesson");
    this.name = "MediaConflictError";
  }
}

/**
 * The write the upload-initiation Route Handler makes once Cloudflare returns a
 * `uid`. If a live media row exists for this Lesson (retry / replace), reset it
 * to `queued` with the new `uid` and return its previous `providerAssetId` so
 * the caller can `deleteVideo()` the orphaned Stream asset. Otherwise insert a
 * fresh `queued` video row.
 */
export async function upsertVideoMediaForUpload(input: {
  lessonId: string;
  providerAssetId: string;
  sizeBytes: number;
  reservedDurationSeconds: number;
}): Promise<{ media: LessonMediaRow; previousAssetId: string | null }> {
  const [existing] = await db
    .select()
    .from(lessonMedia)
    .where(
      and(
        eq(lessonMedia.lessonId, input.lessonId),
        isNull(lessonMedia.removedAt),
      ),
    )
    .limit(1);

  if (existing) {
    const [media] = await db
      .update(lessonMedia)
      .set({
        kind: "video",
        status: "queued",
        providerAssetId: input.providerAssetId,
        sizeBytes: input.sizeBytes,
        reservedDurationSeconds: input.reservedDurationSeconds,
        durationSeconds: null,
        errorReason: null,
      })
      .where(eq(lessonMedia.id, existing.id))
      .returning();
    return { media, previousAssetId: existing.providerAssetId };
  }

  try {
    const [media] = await db
      .insert(lessonMedia)
      .values({
        lessonId: input.lessonId,
        kind: "video",
        status: "queued",
        providerAssetId: input.providerAssetId,
        sizeBytes: input.sizeBytes,
        reservedDurationSeconds: input.reservedDurationSeconds,
      })
      .returning();
    return { media, previousAssetId: null };
  } catch (error) {
    if (isUniquePositionClash(error)) throw new MediaConflictError();
    throw error;
  }
}

/**
 * Total reserved video seconds across an Instructor's non-removed video media
 * (the per-Instructor cap input, AC #2). Joins media → lesson → module → course
 * and filters `removed_at IS NULL` at every level.
 */
export async function sumInstructorReservedVideoSeconds(
  instructorId: string,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(coalesce(${lessonMedia.durationSeconds}, ${lessonMedia.reservedDurationSeconds})), 0)::int`,
    })
    .from(lessonMedia)
    .innerJoin(lesson, eq(lessonMedia.lessonId, lesson.id))
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .innerJoin(course, eq(courseModule.courseId, course.id))
    .where(
      and(
        eq(course.instructorId, instructorId),
        eq(lessonMedia.kind, "video"),
        isNull(lessonMedia.removedAt),
        isNull(lesson.removedAt),
        isNull(courseModule.removedAt),
      ),
    );

  return Number(row?.total ?? 0);
}

/** The webhook's lookup — the live media row for a Cloudflare Stream `uid`. */
export async function getVideoMediaByProviderAssetId(
  providerAssetId: string,
): Promise<LessonMediaRow | null> {
  const [row] = await db
    .select()
    .from(lessonMedia)
    .where(
      and(
        eq(lessonMedia.providerAssetId, providerAssetId),
        isNull(lessonMedia.removedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Apply a Cloudflare Stream webhook's mapped status to the media row. **Never
 * regresses a `ready` row** (`status <> 'ready'` guard) — Cloudflare can send a
 * late in-progress webhook after `ready`. `durationSeconds` is only written
 * when non-null so a `processing` webhook doesn't wipe a real duration.
 */
export async function applyWebhookStatus(input: {
  providerAssetId: string;
  status: LessonMediaStatus;
  durationSeconds: number | null;
  errorReason: string | null;
}): Promise<void> {
  const patch: Partial<typeof lessonMedia.$inferInsert> = {
    status: input.status,
    errorReason: input.errorReason,
  };
  if (input.durationSeconds !== null) {
    patch.durationSeconds = input.durationSeconds;
  }

  await db
    .update(lessonMedia)
    .set(patch)
    .where(
      and(
        eq(lessonMedia.providerAssetId, input.providerAssetId),
        isNull(lessonMedia.removedAt),
        ne(lessonMedia.status, "ready"),
      ),
    );
}

/** The lightweight read the client editor polls while an upload is in flight. */
export async function getLessonMediaStatus(lessonId: string): Promise<{
  status: LessonMediaStatus;
  errorReason: string | null;
  durationSeconds: number | null;
} | null> {
  const [row] = await db
    .select({
      status: lessonMedia.status,
      errorReason: lessonMedia.errorReason,
      durationSeconds: lessonMedia.durationSeconds,
      updatedAt: lessonMedia.updatedAt,
    })
    .from(lessonMedia)
    .where(
      and(eq(lessonMedia.lessonId, lessonId), isNull(lessonMedia.removedAt)),
    )
    .limit(1);

  if (!row) return null;
  // A `queued` row past the upload-URL expiry reads as failed (never a
  // non-webhook write to `status`).
  const effective = effectiveMediaStatus(row.status, row.errorReason, row.updatedAt);
  return {
    status: effective.status,
    errorReason: effective.errorReason,
    durationSeconds: row.durationSeconds,
  };
}

/**
 * Soft-delete the live video media row for a Lesson (AD-11), returning its
 * `providerAssetId` so the caller can `deleteVideo()` the Stream asset. Used by
 * the explicit "Remove video" control and reused by Story 2.11.
 */
export async function removeVideoMedia(input: {
  lessonId: string;
}): Promise<{ previousAssetId: string | null }> {
  const [removed] = await db
    .update(lessonMedia)
    .set({ removedAt: sql`now()` })
    .where(
      and(
        eq(lessonMedia.lessonId, input.lessonId),
        isNull(lessonMedia.removedAt),
      ),
    )
    .returning({ providerAssetId: lessonMedia.providerAssetId });

  return { previousAssetId: removed?.providerAssetId ?? null };
}
