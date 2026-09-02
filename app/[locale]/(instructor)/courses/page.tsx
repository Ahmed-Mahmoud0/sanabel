import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/lib/i18n/navigation";
import { can, getSessionUser } from "@/lib/auth/authorization";
import { listCoursesByInstructor } from "@/lib/modules/course-authoring/service";
import { CourseMetaBadges } from "@/components/course/course-meta-badges";
import { buttonVariants } from "@/components/ui/button";

export default async function MyCourses({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Defense in depth. The (instructor) route-group layout already guards this,
  // but layouts don't re-run on client-side navigation between sibling routes.
  // Convention for Epic 2: instructor/admin pages AND layouts both check via
  // `can()` -> `notFound()`; Server Actions / Route Handlers in these groups
  // use `requireRole()` (throws), since they have no layout to sit behind.
  if (!(await can("instructor"))) {
    notFound();
  }

  const user = await getSessionUser();
  if (!user) {
    notFound();
  }

  const t = await getTranslations("Course");
  const courses = await listCoursesByInstructor(user.id);
  const isEmpty = courses.length === 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-gutter py-8">
      <h1 className="text-heading-lg text-text-primary">{t("list.title")}</h1>
      <p className="mt-1 text-body-sm text-text-secondary">
        {t("list.subtitle")}
      </p>

      {/* AC #5: with zero courses this is a single primary action, no grid
          chrome around it. With courses it's the persistent "Create" action. */}
      <div className={isEmpty ? "mt-8" : "mt-6"}>
        <Link
          href="/courses/new"
          className={buttonVariants({ variant: isEmpty ? "default" : "outline" })}
        >
          {t(isEmpty ? "list.emptyCta" : "list.createCta")}
        </Link>
      </div>

      {!isEmpty && (
        <ul className="mt-6 divide-y divide-border-hairline overflow-hidden rounded-lg border border-border-hairline">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/courses/${course.id}`}
                className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-surface-raised"
              >
                <span className="text-body-sm font-medium text-text-primary">
                  {course.title}
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <CourseMetaBadges
                    category={course.category}
                    contentLanguage={course.contentLanguage}
                    draftLabel={
                      course.publishedAt === null
                        ? t("list.unpublished")
                        : undefined
                    }
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
