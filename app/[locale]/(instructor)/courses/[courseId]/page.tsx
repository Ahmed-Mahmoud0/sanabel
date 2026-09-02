import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/lib/i18n/navigation";
import { can, getSessionUser, isOwner } from "@/lib/auth/authorization";
import { getCourseById } from "@/lib/modules/course-authoring/service";
import { CourseMetaBadges } from "@/components/course/course-meta-badges";

// The destination AC #1 means by "I land in the outline editor". The outline
// editor itself is Story 2.2's job — this is the minimal-but-real course-builder
// landing page it will grow from (same route, not a throwaway placeholder).
export default async function CourseBuilderPage({
  params,
}: {
  params: Promise<{ locale: string; courseId: string }>;
}) {
  const { locale, courseId } = await params;
  setRequestLocale(locale);

  // Defense in depth (role), then ownership: only the course's own Instructor
  // may view its builder. `isOwner` is the shared AD-6 resource-check primitive
  // (lib/auth/authorization.ts), not an inline equality here.
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

  const t = await getTranslations("Course");
  const isDraft = course.publishedAt === null;

  return (
    <main className="mx-auto w-full max-w-3xl px-gutter py-8">
      <Link
        href="/courses"
        className="text-body-sm text-text-secondary underline-offset-4 hover:underline"
      >
        {t("builder.backToCourses")}
      </Link>

      <h1 className="mt-4 text-heading-lg text-text-primary">{course.title}</h1>
      <p className="mt-1 text-body text-text-secondary">{course.description}</p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <CourseMetaBadges
          category={course.category}
          contentLanguage={course.contentLanguage}
          draftLabel={isDraft ? t("builder.draftBadge") : undefined}
        />
      </div>

      <p className="mt-8 text-body-sm text-text-secondary">
        {t("builder.outlineComingSoon")}
      </p>
    </main>
  );
}
