"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

// Sanabel's global language toggle (DESIGN.md {components.language-toggle}):
// a rounded-full pill on `surface-sunken`, the active locale on a raised chip.
// Two-state (EN / AR), lives in the header on every surface.
//
// DESIGN.md's one-liner says the active label renders in `{colors.primary}`;
// measured on the raised chip that pairing is ~3.3:1, under AC #7's 4.5:1 text
// floor (and under DESIGN.md's own "Colors" AA floor). The active label
// therefore uses `{colors.text-primary}` (~16:1) and the brand `{colors.primary}`
// shows as a ring on the chip instead — same raised-chip affordance from the
// DESIGN.md mockup, AA-clean. Flagged for design reconciliation.
//
// Switching is a client-side transition — `router.replace(pathname, {locale})`
// from `lib/i18n/navigation.ts`, never `window.location`. next-intl's own
// wrapper also writes the `NEXT_LOCALE` cookie its proxy manages, which
// `lib/auth/locale.ts` reads to localize transactional email (Story 1.1).
// `window.location.search` is carried across so query state (e.g. the
// `?token=` on /reset-password, `?q=` on /accounts) survives the switch.
export function LanguageSwitcher() {
  const t = useTranslations("Nav.language");
  const activeLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchTo(locale: string) {
    if (locale === activeLocale) return;
    const search = typeof window !== "undefined" ? window.location.search : "";
    startTransition(() => {
      router.replace(`${pathname}${search}`, { locale });
    });
  }

  return (
    <div
      role="group"
      aria-label={t("groupLabel")}
      className="flex rounded-full bg-surface-sunken p-0.5 text-label font-semibold"
    >
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <button
            key={locale}
            type="button"
            // Current locale exposed to AT; the target locale's button carries
            // an action label ("Switch to Arabic"), not a bare "EN"/"AR".
            aria-current={isActive ? "true" : undefined}
            aria-label={isActive ? t("current", { language: t(locale) }) : t("switchTo", { language: t(locale) })}
            disabled={isPending}
            onClick={() => switchTo(locale)}
            className={cn(
              "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-70",
              isActive
                ? "bg-surface-raised text-text-primary ring-1 ring-primary/40"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <span aria-hidden="true">{locale.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
