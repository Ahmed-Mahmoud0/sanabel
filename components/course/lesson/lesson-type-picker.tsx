"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { LESSON_TYPES, type LessonType } from "@/lib/modules/course-authoring/course";
import { setLessonTypeAction } from "@/lib/modules/course-authoring/actions";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/auth/form-message";

/**
 * Choose a Lesson's type — shown only while `lessonType` is still `null` (the
 * first, one-way choice; switching is out of scope for Story 2.4). All five
 * `LESSON_TYPES` are offered; `setLessonTypeAction` commits it, then `onPicked`
 * swaps in the type-specific panel.
 */
export function LessonTypePicker({
  lessonId,
  onPicked,
}: {
  lessonId: string;
  onPicked: (type: LessonType) => void;
}) {
  const t = useTranslations("Course");
  const [pending, setPending] = useState<LessonType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(type: LessonType) {
    if (pending) return;
    setPending(type);
    setError(null);
    try {
      const res = await setLessonTypeAction(lessonId, type);
      if (!res.ok) {
        setError(t("lesson.typePickerError"));
        setPending(null);
        return;
      }
      onPicked(type);
    } catch {
      setError(t("lesson.typePickerError"));
      setPending(null);
    }
  }

  return (
    <section className="mt-6">
      <h2 className="text-heading-md text-text-primary">
        {t("lesson.typePickerLabel")}
      </h2>
      <p className="mt-1 text-body-sm text-text-secondary">
        {t("lesson.typePickerHelp")}
      </p>
      <div
        role="group"
        aria-label={t("lesson.typePickerLabel")}
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {LESSON_TYPES.map((type) => (
          <Button
            key={type}
            type="button"
            variant="outline"
            disabled={pending !== null}
            onClick={() => choose(type)}
          >
            {t(`outline.lessonType.${type}`)}
          </Button>
        ))}
      </div>
      {error && (
        <div className="mt-3">
          <FormMessage tone="error">{error}</FormMessage>
        </div>
      )}
    </section>
  );
}
