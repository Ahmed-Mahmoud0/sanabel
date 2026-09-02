import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { generateId } from "@/lib/db/id";
import { user } from "@/lib/modules/accounts/schema";
import {
  COURSE_CATEGORIES,
  COURSE_CONTENT_LANGUAGES,
} from "@/lib/modules/course-authoring/course";

/**
 * Course Authoring schema slice (AD-2). This module owns Course / Module /
 * Lesson; Story 2.1 introduces only `course` — the first non-Accounts table in
 * the system. Column/timestamp shape deliberately mirrors `accounts/schema.ts`'s
 * `user` table so the two slices read as siblings, not two conventions.
 */

/** See `course.ts` for why this is a bounded enum and not free text. */
export const courseCategory = pgEnum("course_category", COURSE_CATEGORIES);

/** AD-9: one content language per Course, chosen at creation, never translated. */
export const courseContentLanguage = pgEnum(
  "course_content_language",
  COURSE_CONTENT_LANGUAGES,
);

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

export const courseRelations = relations(course, ({ one }) => ({
  instructor: one(user, {
    fields: [course.instructorId],
    references: [user.id],
  }),
}));
