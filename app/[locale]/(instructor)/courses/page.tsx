import { setRequestLocale } from "next-intl/server";

export default async function MyCourses({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <div>My Courses placeholder.</div>;
}
