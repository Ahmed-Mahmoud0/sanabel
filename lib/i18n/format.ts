// Sanabel renders numerals as Western Arabic digits (0–9) in every language —
// a hard rule from the architecture's Consistency Conventions and DESIGN.md's
// Typography section ("Numerals … always render as Western Arabic numerals
// (0–9) in both languages"), matching regional convention and keeping counts,
// progress, and timestamps legible at a glance regardless of active language.
//
// Plain interpolation (`${n}`, `String(n)`) and next-intl's bare `{count}`
// placeholders already produce Latin digits. The trap is *locale-aware* number
// formatting: `Intl.NumberFormat("ar")`, `Number.prototype.toLocaleString("ar")`
// and next-intl's `useFormatter().number()` all switch to Eastern Arabic-Indic
// digits (٠١٢…) under the `ar` locale on most ICU builds, unless the numbering
// system is pinned. Reach for this helper instead of calling those directly:
// grouping and decimals are still formatted, the digits stay `latn`.
//
// Kept deliberately small and single-purpose (same spirit as Story 1.5's
// shared `BIO_MAX_LENGTH`) so Epic 2+ surfaces — "2 of 14 lessons complete",
// video timestamps, quiz scores — have one correct place to reach for.

// Fixed formatting locale: `latn` digits with `en-US` grouping/decimal marks,
// independent of the active UI locale.
const NUMERAL_LOCALE = "en-US";

export function formatNumber(
  value: number,
  options: Omit<Intl.NumberFormatOptions, "numberingSystem"> = {},
): string {
  return new Intl.NumberFormat(NUMERAL_LOCALE, {
    ...options,
    numberingSystem: "latn",
  }).format(value);
}
