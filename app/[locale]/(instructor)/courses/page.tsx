import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { can } from "@/lib/auth/authorization";

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

  return <div>My Courses placeholder.</div>;
}
