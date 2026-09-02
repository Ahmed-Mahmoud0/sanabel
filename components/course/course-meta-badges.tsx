import { useTranslations } from "next-intl";

import type {
  CourseCategory,
  CourseContentLanguage,
} from "@/lib/modules/course-authoring/course";
import { Badge } from "@/components/ui/badge";

/**
 * The category / "Taught in: <language>" / draft badge cluster shown for a
 * course on both the builder landing page and the "My Courses" list. One place
 * so the markup, badge variants, and the nested `taughtIn` translation can't
 * drift between the two surfaces. `draftLabel` is passed in (the two surfaces
 * word it differently — "Draft — not published" vs "Unpublished") and omitted
 * once the course is published.
 */
export function CourseMetaBadges({
  category,
  contentLanguage,
  draftLabel,
}: {
  category: CourseCategory;
  contentLanguage: CourseContentLanguage;
  draftLabel?: string;
}) {
  const t = useTranslations("Course");

  return (
    <>
      <Badge variant="secondary">{t(`categories.${category}`)}</Badge>
      <Badge variant="secondary">
        {t("language.taughtIn", {
          language: t(`language.${contentLanguage}`),
        })}
      </Badge>
      {draftLabel ? <Badge variant="outline">{draftLabel}</Badge> : null}
    </>
  );
}
