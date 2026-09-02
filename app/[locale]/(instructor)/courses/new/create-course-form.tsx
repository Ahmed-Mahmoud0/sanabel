"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { actionErrorText } from "@/lib/actions/result";
import { useRouter } from "@/lib/i18n/navigation";
import {
  COURSE_CATEGORIES,
  COURSE_CONTENT_LANGUAGES,
  COURSE_DESCRIPTION_MAX_LENGTH,
  COURSE_TITLE_MAX_LENGTH,
  parseCourseFields,
} from "@/lib/modules/course-authoring/course";
import { createCourseAction } from "@/lib/modules/course-authoring/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";

// Only four fields — AC #1 is explicit that nothing else is required. Visibility,
// pricing, thumbnails etc. are Story 2.10's territory, not here. On success the
// Server Action returns { courseId } and this component navigates to the course
// landing page (Task 5); the action never redirect()s itself.
export function CreateCourseForm() {
  const t = useTranslations("Course");
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [contentLanguage, setContentLanguage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  // `isPending` stays true through the async action AND the subsequent
  // navigation, so the submit button can't be re-clicked into a duplicate
  // course while the next route loads (same pattern as account-row.tsx).
  const [isPending, startTransition] = useTransition();

  // Option lists + their translated labels are constant for the component's
  // lifetime — build them once, not on every keystroke re-render.
  const categoryItems = useMemo(
    () =>
      COURSE_CATEGORIES.map((value) => ({
        value,
        label: t(`categories.${value}`),
      })),
    [t],
  );
  const languageItems = useMemo(
    () =>
      COURSE_CONTENT_LANGUAGES.map((value) => ({
        value,
        label: t(`language.${value}`),
      })),
    [t],
  );

  // One place maps a Server Action / field-parse `code` to a localized string.
  function codeToMessage(code: string): string {
    return actionErrorText(
      code,
      {
        forbidden: t("new.errorForbidden"),
        title_required: t("new.titleRequiredError"),
        title_too_long: t("new.titleTooLongError", { max: COURSE_TITLE_MAX_LENGTH }),
        description_required: t("new.descriptionRequiredError"),
        description_too_long: t("new.descriptionTooLongError", {
          max: COURSE_DESCRIPTION_MAX_LENGTH,
        }),
        category_invalid: t("new.categoryRequiredError"),
        content_language_invalid: t("new.contentLanguageRequiredError"),
      },
      t("new.errorGeneric"),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);

    // Same rules the Server Action runs — shared `parseCourseFields`, not a
    // hand-copied mirror. Fast feedback only; the action re-parses regardless.
    const parsed = parseCourseFields({ title, description, category, contentLanguage });
    if (!parsed.ok) {
      setError(codeToMessage(parsed.error));
      return;
    }

    startTransition(async () => {
      try {
        const result = await createCourseAction(parsed.value);
        if (!result.ok) {
          setError(codeToMessage(result.error.code));
          return;
        }

        // Land the Instructor on the course builder (AC #1). Story 2.2 grows
        // this same route into the real outline editor.
        router.push(`/courses/${result.data.courseId}`);
        router.refresh();
      } catch {
        setError(t("new.errorGeneric"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      <Field
        id="title"
        label={t("new.titleLabel")}
        placeholder={t("new.titlePlaceholder")}
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
          setError(null);
        }}
        maxLength={COURSE_TITLE_MAX_LENGTH}
        autoComplete="off"
        required
        disabled={isPending}
      />

      <Field
        id="description"
        label={t("new.descriptionLabel")}
        placeholder={t("new.descriptionPlaceholder")}
        value={description}
        onChange={(event) => {
          setDescription(event.target.value);
          setError(null);
        }}
        maxLength={COURSE_DESCRIPTION_MAX_LENGTH}
        autoComplete="off"
        required
        disabled={isPending}
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">{t("new.categoryLabel")}</Label>
        <Select
          items={categoryItems}
          value={category}
          onValueChange={(value) => {
            setCategory(value ?? "");
            setError(null);
          }}
        >
          <SelectTrigger id="category" className="w-full" disabled={isPending}>
            <SelectValue placeholder={t("new.categoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {categoryItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contentLanguage">{t("new.contentLanguageLabel")}</Label>
        <Select
          items={languageItems}
          value={contentLanguage}
          onValueChange={(value) => {
            setContentLanguage(value ?? "");
            setError(null);
          }}
        >
          <SelectTrigger
            id="contentLanguage"
            className="w-full"
            aria-describedby="contentLanguage-hint"
            disabled={isPending}
          >
            <SelectValue placeholder={t("new.contentLanguagePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {languageItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p
          id="contentLanguage-hint"
          className="text-body-sm text-text-secondary"
        >
          {t("new.contentLanguageHint")}
        </p>
      </div>

      {error && <FormMessage tone="error">{error}</FormMessage>}

      <Button type="submit" disabled={isPending} className="mt-2 self-start">
        {isPending ? t("new.submitting") : t("new.submit")}
      </Button>
    </form>
  );
}
