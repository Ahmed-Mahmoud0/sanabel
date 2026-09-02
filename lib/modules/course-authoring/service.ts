import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import type {
  CourseCategory,
  CourseContentLanguage,
} from "@/lib/modules/course-authoring/course";
import { course } from "@/lib/modules/course-authoring/schema";

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
