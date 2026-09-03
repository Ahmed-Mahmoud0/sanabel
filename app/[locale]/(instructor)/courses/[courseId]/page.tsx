import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { can, getSessionUser, isOwner } from "@/lib/auth/authorization";
import {
  getCourseById,
  getCourseOutline,
} from "@/lib/modules/course-authoring/service";
import { OutlineEditor } from "@/components/course/outline/outline-editor";

// The course-builder route Story 2.1 reserved ("I land in the outline editor").
// Story 2.2 grows it into the actual outline editor — same route, not a new one.
export default async function CourseBuilderPage({
  params,
}: {
  params: Promise<{ locale: string; courseId: string }>;
}) {
  const { locale, courseId } = await params;
  setRequestLocale(locale);

  // Defense in depth (role), then ownership: only the course's own Instructor
  // may open its builder. `isOwner` is the shared AD-6 resource primitive.
  if (!(await can("instructor"))) {
    notFound();
  }

  const [user, course] = await Promise.all([
    getSessionUser(),
    getCourseById(courseId),
  ]);

  if (!course || !isOwner(user, course.instructorId)) {
    notFound();
  }

  const outline = await getCourseOutline(course.id);

  return (
    <OutlineEditor
      courseId={course.id}
      courseTitle={course.title}
      category={course.category}
      contentLanguage={course.contentLanguage}
      isDraft={course.publishedAt === null}
      initialOutline={outline}
    />
  );
}
