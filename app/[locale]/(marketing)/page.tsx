import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("Scaffold");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-surface-base p-gutter">
      <h1 className="text-display text-text-primary">{t("title")}</h1>
      <p className="text-body text-text-secondary">{t("description")}</p>
      <p className="text-label text-text-disabled">{t("localeLabel")}</p>
      <div className="flex gap-3">
        <span className="rounded-md bg-primary px-4 py-2 text-body-sm text-primary-foreground">
          {t("primaryColor")}
        </span>
        <span className="rounded-md bg-secondary px-4 py-2 text-body-sm text-secondary-foreground">
          {t("secondaryColor")}
        </span>
        <span className="rounded-md bg-accent px-4 py-2 text-body-sm text-accent-foreground">
          {t("accentColor")}
        </span>
      </div>
    </main>
  );
}
