import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { can, getSessionUser, isOwner } from "@/lib/auth/authorization";
import { effectiveMediaStatus } from "@/lib/modules/course-authoring/media";
import { getLessonEditorData } from "@/lib/modules/course-authoring/service";
import { isStreamConfigured } from "@/lib/modules/course-authoring/stream";
import { LessonEditor } from "@/components/course/lesson/lesson-editor";

/**
 * Per-Lesson-Type authoring surface (EXPERIENCE.md IA: "Lesson authoring
 * (per type) — Outline editor → a lesson row"). Story 2.4 builds the type
 * picker + the Video panel; Stories 2.5–2.8 fill the other four panels.
 *
 * Guards mirror `courses/[courseId]/page.tsx` verbatim, plus: the URL's
 * `courseId` must match the Lesson's real course (never trust the path).
 */
export default async function LessonEditorPage({
  params,
}: {
  params: Promise<{ locale: string; courseId: string; lessonId: string }>;
}) {
  const { locale, courseId, lessonId } = await params;
  setRequestLocale(locale);

  if (!(await can("instructor"))) {
    notFound();
  }

  const [user, data] = await Promise.all([
    getSessionUser(),
    getLessonEditorData(lessonId),
  ]);

  if (!data || !isOwner(user, data.instructorId) || data.courseId !== courseId) {
    notFound();
  }

  return (
    <LessonEditor
      courseId={courseId}
      courseTitle={data.courseTitle}
      lessonId={lessonId}
      lessonTitle={data.lesson.title}
      lessonType={data.lesson.lessonType}
      initialNote={data.lesson.contentBody?.note ?? ""}
      initialMedia={
        data.media
          ? {
              ...effectiveMediaStatus(
                data.media.status,
                data.media.errorReason,
                data.media.updatedAt,
              ),
              durationSeconds: data.media.durationSeconds,
            }
          : null
      }
      streamConfigured={isStreamConfigured()}
    />
  );
}
