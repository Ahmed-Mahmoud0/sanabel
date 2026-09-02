import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { can } from "@/lib/auth/authorization";

import { CreateCourseForm } from "./create-course-form";

export default async function NewCoursePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Defense in depth. The (instructor) route-group layout already guards this,
  // but layouts don't re-run on client-side navigation between sibling routes —
  // same convention as courses/page.tsx. `can()` -> notFound() for pages;
  // createCourseAction re-checks with requireRole().
  if (!(await can("instructor"))) {
    notFound();
  }

  const t = await getTranslations("Course.new");

  return (
    <main className="mx-auto w-full max-w-xl px-gutter py-8">
      <h1 className="text-heading-lg text-text-primary">{t("title")}</h1>
      <p className="mt-1 text-body-sm text-text-secondary">{t("subtitle")}</p>

      <CreateCourseForm />
    </main>
  );
}
