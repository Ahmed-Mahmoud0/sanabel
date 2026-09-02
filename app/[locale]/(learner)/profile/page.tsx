import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/lib/i18n/navigation";
import { getSessionUser } from "@/lib/auth/authorization";
import { ProfileForm } from "./profile-form";

// Any signed-in account can edit its profile — the `(learner)` route group's
// guard is "signed in", not "acting as a Learner" (Story 1.3), which is exactly
// right here: Instructors and the Admin need this page too. The layout already
// redirects signed-out visitors to sign-in; this page repeats that guard as
// defense-in-depth (same convention as the admin pages, which re-check `can()`),
// so it fails safe rather than rendering an empty document if the layout guard
// ever regresses.
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Profile");
  const user = await getSessionUser();
  if (!user) {
    return redirect({ href: "/sign-in", locale });
  }

  return (
    <main className="mx-auto w-full max-w-xl px-gutter py-8">
      <h1 className="text-heading-lg text-text-primary">{t("title")}</h1>
      <p className="mt-1 text-body-sm text-text-secondary">{t("subtitle")}</p>

      <ProfileForm
        initialName={user.name}
        initialBio={user.bio ?? ""}
        isInstructor={user.isInstructor === true}
      />
    </main>
  );
}
