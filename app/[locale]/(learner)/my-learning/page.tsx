import { setRequestLocale } from "next-intl/server";

export default async function MyLearning({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <div>My Learning placeholder.</div>;
}
