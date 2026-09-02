import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { Link } from "@/lib/i18n/navigation";
import { getSessionUser, hasRole } from "@/lib/auth/authorization";
import { SignOutButton } from "@/components/nav/sign-out-button";
import { LanguageSwitcher } from "@/components/nav/language-switcher";
import { ThemeSwitcher } from "@/components/nav/theme-switcher";

// The app's first real navigation header. Server Component: it reads the
// session (with AD-6 role flags) and decides which links to *render at all*.
// Gated links are absent from the DOM for a disallowed viewer — never
// rendered-and-hidden or rendered-and-disabled (AC #1).
export async function SiteHeader() {
  const t = await getTranslations("Nav");
  const user = await getSessionUser();

  // `min-h-11` keeps every nav target at the ~44px touch floor (Story 1.6
  // Task 6) without changing the visual type size.
  const linkClass =
    "inline-flex min-h-11 items-center text-body-sm text-text-secondary transition-colors hover:text-text-primary";
  const authLinkClass =
    "text-body-sm font-medium text-primary underline-offset-4 hover:underline";

  return (
    <header className="border-b border-border-hairline bg-surface-raised">
      {/* `flex-wrap` so a narrow / signed-in-with-role-links viewport degrades
          to stacked rows instead of overflowing horizontally (no dedicated
          mobile menu in scope). It's inert once everything fits on one line. */}
      <nav
        aria-label={t("primaryLabel")}
        className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-gutter py-3"
      >
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-heading-md font-bold text-text-primary"
        >
          {t("brand")}
        </Link>

        <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
          {user && (
            <Link href="/my-learning" className={linkClass}>
              {t("myLearning")}
            </Link>
          )}
          {user && (
            <Link href="/profile" className={linkClass}>
              {t("profile")}
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

        {/* Trailing slot — language + theme switchers (Story 1.6), then auth. */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />
          {user ? (
            <SignOutButton label={t("signOut")} />
          ) : (
            <>
              <Link href="/sign-in" className={cn(authLinkClass, "inline-flex min-h-11 items-center px-1")}>
                {t("signIn")}
              </Link>
              <Link href="/sign-up" className={cn(authLinkClass, "inline-flex min-h-11 items-center px-1")}>
                {t("signUp")}
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
