"use client";

import { useTranslations } from "next-intl";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading UI for the outline editor (AC #5) — skeleton rows in the
 * expected Module → Lesson shape, never a blank screen. Client component so it
 * can pull its accessible-name string from `useTranslations` without depending
 * on request-locale resolution inside `loading.tsx`.
 */
export function OutlineEditorSkeleton() {
  const t = useTranslations("Course");

  return (
    <main
      className="mx-auto w-full max-w-3xl px-gutter py-8"
      aria-busy="true"
    >
      <span className="sr-only" role="status">
        {t("outline.loadingOutline")}
      </span>

      {/* header bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border-hairline pb-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-24" />
      </div>

      {/* modules */}
      <div className="mt-6 flex flex-col gap-6">
        {[0, 1].map((moduleIndex) => (
          <div key={moduleIndex} className="flex flex-col gap-3">
            <Skeleton className="h-6 w-2/5" />
            <div className="flex flex-col gap-2 ps-6">
              {[0, 1, 2].map((lessonIndex) => (
                <Skeleton key={lessonIndex} className="h-11 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
