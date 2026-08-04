import { setRequestLocale } from "next-intl/server";

export default async function ModerationQueue({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <div>Moderation queue placeholder.</div>;
}
