"use client";

import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading UI for the lesson editor — same idiom as
 * `OutlineEditorSkeleton`. Client component so it can pull its accessible-name
 * string from `useTranslations` without request-locale resolution in
 * `loading.tsx`.
 */
export function LessonEditorSkeleton() {
  const t = useTranslations("Course");

  return (
    <main className="mx-auto w-full max-w-3xl px-gutter py-8" aria-busy="true">
      <span className="sr-only" role="status">
        {t("lesson.loading")}
      </span>

      <div className="flex items-center justify-between gap-3 border-b border-border-hairline pb-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-5 w-24" />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </main>
  );
}
