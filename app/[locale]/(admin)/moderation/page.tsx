import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { can } from "@/lib/auth/authorization";

export default async function ModerationQueue({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Defense in depth — see the note in (instructor)/courses/page.tsx. The
  // (admin) layout already guards this; layouts don't re-run on client-side
  // navigation. Admin does NOT imply Instructor (AD-6): this checks `isAdmin`
  // only.
  if (!(await can("admin"))) {
    notFound();
  }

  return <div>Moderation queue placeholder.</div>;
}
