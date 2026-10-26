import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { can, getSessionUser, isOwner } from "@/lib/auth/authorization";
import {
  effectiveMediaStatus,
  lessonNoteOf,
} from "@/lib/modules/course-authoring/media";
import { textDocOf } from "@/lib/modules/course-authoring/text-body";
import { getLessonEditorData } from "@/lib/modules/course-authoring/service";
import { isStorageConfigured } from "@/lib/modules/course-authoring/storage";
import { isStreamConfigured } from "@/lib/modules/course-authoring/stream";
import { LessonEditor } from "@/components/course/lesson/lesson-editor";

/**
 * Per-Lesson-Type authoring surface (EXPERIENCE.md IA: "Lesson authoring
 * (per type) — Outline editor → a lesson row"). Story 2.4 builds the type
 * picker + the Video panel; Stories 2.5–2.8 fill the other panels (2.6: PDF).
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

  // A media row only populates the panel of its own kind.
  const media = data.media;
  const effective = media
    ? effectiveMediaStatus(media.status, media.errorReason, media.updatedAt)
    : null;
  const videoMedia = media && effective && media.kind === "video" ? media : null;
  const pdfMedia = media && effective && media.kind === "pdf" ? media : null;

  return (
    <LessonEditor
      courseId={courseId}
      courseTitle={data.courseTitle}
      lessonId={lessonId}
      lessonTitle={data.lesson.title}
      lessonType={data.lesson.lessonType}
      contentLanguage={data.contentLanguage}
      initialNote={lessonNoteOf(data.lesson.contentBody)}
      initialDoc={textDocOf(data.lesson.contentBody)}
      initialMedia={
        videoMedia && effective
          ? { ...effective, durationSeconds: videoMedia.durationSeconds }
          : null
      }
      initialPdf={
        pdfMedia && effective
          ? {
              ...effective,
              fileName: pdfMedia.fileName,
              sizeBytes: pdfMedia.sizeBytes,
              previous: pdfMedia.previousPdf
                ? {
                    fileName: pdfMedia.previousPdf.fileName,
                    sizeBytes: pdfMedia.previousPdf.sizeBytes,
                  }
                : null,
            }
          : null
      }
      streamConfigured={isStreamConfigured()}
      storageConfigured={isStorageConfigured()}
    />
  );
}
