import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { getSessionUser, hasRole } from "@/lib/auth/authorization";
import { SignOutButton } from "@/components/nav/sign-out-button";

// The app's first real navigation header. Server Component: it reads the
// session (with AD-6 role flags) and decides which links to *render at all*.
// Gated links are absent from the DOM for a disallowed viewer — never
// rendered-and-hidden or rendered-and-disabled (AC #1).
export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const user = await getSessionUser();

  const linkClass =
    "text-body-sm text-text-secondary transition-colors hover:text-text-primary";
  const authLinkClass =
    "text-body-sm font-medium text-primary underline-offset-4 hover:underline";

  return (
    <header className="border-b border-border-hairline bg-surface-raised">
      <nav
        aria-label={t("primaryLabel")}
        className="mx-auto flex w-full max-w-5xl items-center gap-4 px-gutter py-3"
      >
        <Link
          href="/"
          className="text-heading-md font-bold text-text-primary"
        >
          {t("brand")}
        </Link>

        <div className="flex flex-1 items-center gap-4">
          {user && (
            <Link href="/my-learning" className={linkClass}>
              {t("myLearning")}
            </Link>
          )}
          {hasRole(user, "instructor") && (
            <Link href="/courses" className={linkClass}>
              {t("myCourses")}
            </Link>
          )}
          {hasRole(user, "admin") && (
            <Link href="/moderation" className={linkClass}>
              {t("moderation")}
            </Link>
          )}
        </div>

        {/* Trailing slot — Story 1.6 adds the language switcher alongside this. */}
        <div className="flex items-center gap-3">
          {user ? (
            <SignOutButton label={t("signOut")} />
          ) : (
            <>
              <Link href="/sign-in" className={authLinkClass}>
                {t("signIn")}
              </Link>
              <Link href="/sign-up" className={authLinkClass}>
                {t("signUp")}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
