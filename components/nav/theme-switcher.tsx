"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

// Finishes Story 1.0's deferred theme-switcher UI. Provider wiring, the
// flash-free pre-hydration class, and `localStorage` persistence live in
// `app/[locale]/layout.tsx` via `next-themes`; this is just the control.
//
// A single cycle button (System → Light → Dark → …) keeps the header compact
// next to the language switcher. "System" means "follow prefers-color-scheme",
// matching AC #6's wording; it's also `next-themes`' default when nothing is
// stored.

type Theme = "system" | "light" | "dark";
const ORDER: readonly Theme[] = ["system", "light", "dark"];
const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

function isTheme(value: string | undefined): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

const noopSubscribe = () => () => {};

export function ThemeSwitcher() {
  const t = useTranslations("Nav.theme");
  const { theme, setTheme } = useTheme();
  // `true` only after hydration. The stored theme is unknown during SSR, so
  // gate the icon/label to keep the server and first client render identical.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  // `next-themes` returns whatever string is in `localStorage["theme"]` without
  // validating it against its theme list, so a stale/tampered value must not
  // reach `ICONS[...]` (undefined element → render crash) or `t(...)` (missing
  // key). Fall back to "system"; the next click still writes a valid value.
  const current: Theme = mounted && isTheme(theme) ? theme : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICONS[current];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`${t("current", { theme: t(current) })}. ${t("switchTo", { theme: t(next) })}`}
      title={t("current", { theme: t(current) })}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-text-secondary transition-colors",
        "hover:bg-surface-sunken hover:text-text-primary",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}
