import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { generateId } from "@/lib/db/id";
import { user } from "@/lib/modules/accounts/schema";
import {
  COURSE_CATEGORIES,
  COURSE_CONTENT_LANGUAGES,
  LESSON_TYPES,
} from "@/lib/modules/course-authoring/course";

/**
 * Course Authoring schema slice (AD-2). This module owns Course / Module /
 * Lesson. Story 2.1 introduced `course`; Story 2.2 adds `module` and `lesson`
 * (the nested outline). Column/timestamp shape deliberately mirrors `course`
 * (and, before it, `accounts/schema.ts`'s `user`) so every slice reads as a
 * sibling, not a fresh convention: `text` PK via `generateId()` (UUIDv7),
 * `timestamptz` everywhere, `defaultNow()` + `$onUpdate` on the audit columns,
 * one index per FK.
 */

/** See `course.ts` for why this is a bounded enum and not free text. */
export const courseCategory = pgEnum("course_category", COURSE_CATEGORIES);

/** AD-9: one content language per Course, chosen at creation, never translated. */
export const courseContentLanguage = pgEnum(
  "course_content_language",
  COURSE_CONTENT_LANGUAGES,
);

/**
 * FR-9 Lesson Types. Nullable on the `lesson` row (see below) — Story 2.2
 * creates Lessons title-only; the picker ships in Stories 2.4–2.8.
 */
export const lessonTypeEnum = pgEnum("lesson_type", LESSON_TYPES);

export const course = pgTable(
  "course",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),
    // FK to Accounts' `user` table. Cross-module *reads* still go through
    // `accounts` service functions (AD-3); a schema-level FK for referential
    // integrity is not that — it mirrors how `session`/`account` reference
    // `user` in the same repo.
    instructorId: text("instructor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // "One-line" description. Soft length cap lives in
    // `course-authoring/course.ts` and is enforced client + server, not as a DB
    // constraint (same call as Story 1.5's `bio`).
    description: text("description").notNull(),
    category: courseCategory("category").notNull(),
    contentLanguage: courseContentLanguage("content_language").notNull(),
    // `timestamptz` per the Architecture Spine Consistency Conventions ("all
    // timestamps are UTC timestamptz"). `null` publishedAt == unpublished /
    // draft; Story 2.10 sets it on publish.
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // "My Courses" and every later ownership check filter by instructor.
    index("course_instructor_id_idx").on(table.instructorId),
  ],
);

// Exported as `courseModule` (not `module`) — `module` as a top-level binding
// trips Next's `no-assign-module-variable` lint. The DB table is still `module`.
export const courseModule = pgTable(
  "module",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),
    courseId: text("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // 0-based, contiguous within a course. New Modules append
    // (position = current non-removed count); Story 2.3 rewrites sibling
    // positions on drag-reorder. Not fractional indexing — see Story 2.2 Task 2.
    position: integer("position").notNull(),
    // AD-11 soft-delete. Story 2.2 has no removal UI, but every outline read
    // filters `removed_at IS NULL` from day one so Stories 2.3 / 2.11 and
    // Epic 4's isCourseComplete() inherit a correct base rather than a retrofit.
    removedAt: timestamp("removed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("module_course_id_idx").on(table.courseId),
    // No two live Modules in one Course may share a `position`. Makes the
    // read-then-append race in `addModule` fail loudly (23505) instead of
    // silently producing a duplicate; `addModule` retries into the next slot.
    uniqueIndex("module_course_position_uq")
      .on(table.courseId, table.position)
      .where(sql`${table.removedAt} is null`),
  ],
);

export const lesson = pgTable(
  "lesson",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId()),
    moduleId: text("module_id")
      .notNull()
      .references(() => courseModule.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // Nullable: AC #2 — a Lesson exists with a title and no type chosen yet.
    // Part of AD-4 autosave field-group (a) "outline metadata".
    lessonType: lessonTypeEnum("lesson_type"),
    position: integer("position").notNull(),
    // AD-7: every Lesson carries `required` (default true) so Epic 4's single
    // isCourseComplete() has a stable input regardless of Lesson Type. Story
    // 2.2 AC #6 surfaces the toggle — the Instructor opts a Lesson *out*.
    required: boolean("required").notNull().default(true),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("lesson_module_id_idx").on(table.moduleId),
    // No two live Lessons in one Module may share a `position` (see `module`).
    uniqueIndex("lesson_module_position_uq")
      .on(table.moduleId, table.position)
      .where(sql`${table.removedAt} is null`),
  ],
);

export const courseRelations = relations(course, ({ one, many }) => ({
  instructor: one(user, {
    fields: [course.instructorId],
    references: [user.id],
  }),
  modules: many(courseModule),
}));

export const moduleRelations = relations(courseModule, ({ one, many }) => ({
  course: one(course, {
    fields: [courseModule.courseId],
    references: [course.id],
  }),
  lessons: many(lesson),
}));

export const lessonRelations = relations(lesson, ({ one }) => ({
  module: one(courseModule, {
    fields: [lesson.moduleId],
    references: [courseModule.id],
  }),
}));
