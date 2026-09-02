---
baseline_commit: a12c043a2d6bd28d5633f275222f0ff8a88d1bb1
---

# Story 1.6: Bilingual UI Shell & Language Switcher

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to use Sanabel in English or Arabic with correct right-to-left layout,
so that I can use the product comfortably in my own language.

## Acceptance Criteria

1. **Given** I am on any page of the product, **when** I open the global header's language toggle and select Arabic, **then** all UI chrome (navigation, buttons, system messages, account flows) re-renders in Arabic with `dir="rtl"`, using logical layout properties so the whole page mirrors correctly — not just mirrored text.
2. **Given** I am mid-way through filling an authenticated form (e.g. a partially-filled field), **when** I switch language, **then** my in-progress state is preserved — no page reload, no re-login, no lost input.
3. **Given** I am viewing the product in Arabic, **when** I look at numerals (counts, dates, etc.) anywhere shown so far (e.g. profile, account settings), **then** they render as Western Arabic digits (0–9), not Eastern Arabic-Indic digits.
4. **Given** I am using a screen reader, **when** I navigate the page in either language, **then** interactive elements expose a role and accessible name, and text runs carry the correct `lang` attribute per language.
5. **Given** I am on a touch device, **when** I interact with any button, link, or form control, **then** it meets a minimum touch/click target size consistent with mobile-first rendering.
6. **Given** my system `prefers-color-scheme` is set to dark or light, **when** I load Sanabel without having chosen a theme, **then** the UI follows my system preference by default, using DESIGN.md's light/dark token pairs, and I can override it manually.
7. **Given** I view any interactive element (buttons, form fields, links), **when** I check text/background color pairings, **then** they meet WCAG AA contrast (4.5:1 body text, 3:1 large text) in both light and dark mode.

## Tasks / Subtasks

- [x] Task 0: Read this before starting — this story is unusually broad on purpose
  - [x] Every prior Epic 1 story has been quietly building the bilingual/token foundation (next-intl routing, `dir` switching, logical properties, DESIGN.md tokens) while explicitly deferring two concrete UI controls to "a later story": Story 1.0's own comment in `app/globals.css` says the `.dark`/`.light` override classes exist "once a theme-switcher UI lands in a later story," and Story 1.3's `site-header.tsx` has a literal commented slot: `{/* Trailing slot — Story 1.6 adds the language switcher alongside this. */}`. This story is that later story for both. It is not new invention — it's building the last two missing controls on top of infrastructure that already works, plus closing a few site-wide gaps (numerals, touch targets, a holistic a11y pass) that no single prior story owned.
- [x] Task 1: Investigate mid-form state preservation across a locale switch **before** building the toggle (AC #2)
  - [x] This AC is genuinely hard, not a formality. next-intl's own documented `LocaleSwitcher` pattern (`router.replace(pathname, {locale})` from `lib/i18n/navigation.ts`, already exported per Story 1.1) navigates to a new URL under the `[locale]` dynamic segment — and a well-known, still-open next-intl GitHub issue (`amannn/next-intl#496`, "Persisting state and context on locale change") reports that this kind of navigation resets Client Component state and context that lives inside the locale-scoped tree, because the whole `app/[locale]/...` subtree re-renders for the new segment value
  - [x] **Verify empirically against this app's actual Next.js 16.2 behavior before deciding on a fix** — the online reports are from older Next.js/next-intl versions and may not reflect current behavior. Build a minimal version of the switcher (Task 2), partially fill a text field on `/profile` or `/sign-up`, switch language, and observe directly whether the typed value survives
  - [x] **If state survives naturally: stop here, no further work needed for this AC.** If it does not survive: apply the smallest fix that closes the gap for this app's actual forms — mirror in-progress **non-sensitive** field values (email, display name, bio, search query) to `sessionStorage` on change, and rehydrate on mount after a locale switch. **Never mirror a password field to any storage API** — if a mid-typed password on `/sign-up`/`/sign-in` is lost on a language switch because of this exclusion, that is a deliberate, documented exception to this AC's letter for a clear security reason, not an oversight. Do not build a generic "persist any form's state" abstraction; apply this narrowly to the handful of real forms in the app today (Stories 1.1, 1.5)
- [x] Task 2: Language switcher control (AC #1, #2)
  - [x] Build `components/nav/language-switcher.tsx` and render it in `site-header.tsx`'s existing trailing slot. Use `useRouter`/`usePathname` from `lib/i18n/navigation.ts` + `useLocale()` from `next-intl`, calling `router.replace(pathname, { locale: nextLocale })` — this is a client-side transition (no `window.location`, no full reload), and it updates the `NEXT_LOCALE` cookie next-intl's own middleware manages, which `lib/auth/locale.ts` (Story 1.1) already reads for transactional email locale — a real, useful side effect of getting this right, not a coincidence to re-derive
  - [x] Toggle affordance: two-state control (EN/AR), current language visually indicated, accessible name announces both the current state and the action (e.g. "Switch to Arabic" / "التبديل إلى الإنجليزية" — not a bare "EN"/"AR" with no context for a screen-reader user)
- [x] Task 3: Theme switcher control — finishes Story 1.0's deferred work (AC #6)
  - [x] `app/globals.css` already has the full token machinery: `@media (prefers-color-scheme: dark)` for the system default, plus standalone `.dark`/`.light` classes for a manual override (Story 1.0) — nothing in the token layer needs to change
  - [x] Add the actual toggle. **Recommended:** `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`) — it solves the flash-of-wrong-theme-on-load problem correctly (an inline script sets the class before hydration), which is genuinely easy to get wrong hand-rolled. Verify the installed version's exact provider API against its own type defs before wiring it (same practice this project has used for every other library so far) rather than assuming a specific prop shape holds across versions. A hand-rolled `localStorage` + inline-script equivalent is an acceptable alternative given the CSS already supports either — but don't ship a version with a visible flash/flicker on first paint or one that loses the choice on reload
  - [x] Persist the manual choice (`localStorage`, not account data — this is a device preference, not something AD-2's Accounts module needs to own); absence of a stored choice means "follow system," matching AC #6's literal wording
  - [x] Render alongside the language switcher in the header's trailing slot
- [x] Task 4: Numeral guardrail (AC #3)
  - [x] Audit numerals in every existing UI surface (Story 1.5's bio character counter is the one place a count renders today) — plain JS template-literal/`String(n)` interpolation, which is what's used everywhere so far, already renders Western Arabic digits regardless of locale by default; confirm nothing needs retrofitting
  - [x] The real risk is forward-looking: `Intl.NumberFormat`/`toLocaleString(locale)`/next-intl's `useFormatter().number()` called with the `ar` locale switch to Eastern Arabic-Indic digits (CLDR's default numbering system for Arabic) unless `numberingSystem: "latn"` is explicitly pinned. Add a small shared `lib/i18n/format.ts` exporting a `formatNumber(value: number)` helper that always pins `numberingSystem: "latn"`, so Epic 2+ (lesson counts, "2 of 14 lessons complete," video timestamps) has one correct place to reach for instead of each story rediscovering this rule independently — same spirit as Story 1.5's shared `BIO_MAX_LENGTH` constant
- [x] Task 5: Site-wide accessibility audit — roles, accessible names, `lang` (AC #4)
  - [x] This AC says "any page," not just new ones — do a holistic pass across every page built in Stories 1.0–1.5 (marketing home, sign-up/in, forgot/reset-password, my-learning, courses, moderation, accounts, profile), confirming every interactive element has a role + accessible name and every text run carries the correct `lang` (already handled at the root via `<html lang={locale}>`, Story 1.0 — verify nothing overrides it incorrectly for embedded mixed-script content)
  - [x] This is a verification pass, not new component-building — prior stories already built each surface with this bar in mind; the value here is confirming it holds *together*, not re-implementing it
- [x] Task 6: Touch target size pass (AC #5)
  - [x] No exact number is pinned anywhere in DESIGN.md/the PRD — apply the commonly-cited ~44×44 CSS px minimum (WCAG 2.5.5 / Apple HIG range) as this story's documented judgment call, same posture as Story 1.5's 280-char bio limit
  - [x] Fix at the shared-component level first (`components/ui/{button,input,textarea}.tsx`'s default sizing) so the change flows through every existing usage site automatically, rather than patching each page individually. Spot-check the new language/theme switcher controls and existing nav links/buttons at a mobile viewport width after the change
- [x] Task 7: WCAG AA contrast verification (AC #7)
  - [x] DESIGN.md's Colors section already states its token pairs are pre-verified at AA; this story's own theme toggle (Task 3) is what finally makes *reliably* testing dark mode possible without changing the OS's own setting — use it to spot-check the contrast of body text, button labels, and form-field text/borders in both modes, rather than re-deriving the palette
  - [x] No new tokens or colors — this is confirmation, not design work
- [x] Task 8: i18n for the new controls + end-to-end verification (all ACs)
  - [x] Extend the `Nav` namespace in `lib/i18n/en.json`/`lib/i18n/ar.json`: language-switcher and theme-switcher labels/accessible names — no hardcoded strings
  - [x] Walk all 7 ACs: toggle language on several existing pages (sign-in, profile, accounts) and confirm full chrome re-renders correctly with `dir` flipped; verify Task 1's state-preservation outcome directly; check numerals; run a screen-reader pass (or accessibility-tree read) in both languages; check touch targets at a mobile viewport; toggle themes and confirm no flash and persistence across reload; spot-check contrast in both modes
  - [x] `npm run build`, `npx tsc --noEmit`, `npm run lint` clean

## Dev Notes

- **Why this story is broad:** it is the designated closer for Epic 1's bilingual/theming shell — two concrete deferrals (language switcher, theme switcher) plus three site-wide concerns (numerals, touch targets, a holistic a11y/contrast pass) that no single earlier story owned end-to-end. It is not scope creep; every item traces to either an explicit prior-story deferral comment in the actual code or one of this story's own seven ACs.
- **AC #2 is the one genuine unknown — treat Task 1 as a spike, not a formality.** Don't design a fix before observing the actual behavior in this app's Next.js 16.2/next-intl combination. The well-known GitHub issue cited in Task 1 is real evidence state loss is a common outcome of this exact pattern, but it isn't proof for *this* app's exact versions — verify first.
- **Never persist a password field to `sessionStorage`/`localStorage`, even to satisfy AC #2's letter.** If Task 1's investigation shows state genuinely gets lost, the fix targets non-sensitive fields only; a mid-typed password being lost on a language switch is an accepted, documented trade-off for a real security reason, not a gap to silently "fix" by storing it anyway.
- **The theme choice is a device preference, not Accounts-module data.** Don't add a `theme` column to `user` or otherwise route it through Better Auth's `additionalFields` (the pattern Stories 1.3/1.5 established for *account* data like roles and bio) — `localStorage`, scoped to the browser, is the correct layer here, and pulling it into the Accounts module would misapply that pattern to something that isn't account state.
- **`next-intl`'s `router.replace(pathname, {locale})` already updates the `NEXT_LOCALE` cookie** that `lib/auth/locale.ts` (Story 1.1) reads to pick the language for transactional emails — building the language switcher correctly is what actually makes that Story 1.1 mechanism reachable end-to-end for the first time (a signed-up-in-English user who switches to Arabic and later triggers a password reset will get an Arabic email). Worth confirming in Task 8's verification pass, not just assuming it follows.
- **Module boundary (AD-1–AD-3) is essentially not in play for this story** — no new database tables, no new Accounts writes (the language/theme controls are pure client-side + existing next-intl/Better Auth-cookie infrastructure). The one thing to avoid, per the point above, is accidentally pulling theme preference into a module it doesn't belong to.
- **Reuse established conventions:** `components/ui/button.tsx`, DESIGN.md tokens, the `Link`/`useRouter`/`usePathname` exports from `lib/i18n/navigation.ts`, and the icon-as-inline-SVG pattern (Story 1.2) if the switchers need icons (sun/moon, a language glyph) rather than pulling in a new icon library for a couple of glyphs.
- **No dedicated test framework is pinned in the architecture** (same as every prior Epic 1 story) — verification is the AC walkthrough (Task 8) plus `build`/`tsc`/`lint`.

### Project Structure Notes

- New/edited files, all within the existing structure — no new top-level directories:
  - `components/nav/language-switcher.tsx`, `components/nav/theme-switcher.tsx` (new)
  - `components/nav/site-header.tsx` (edit — fill the reserved trailing slot)
  - `app/[locale]/layout.tsx` (edit — theme provider wiring, e.g. `next-themes`' provider around `NextIntlClientProvider` or equivalent, `suppressHydrationWarning` already present on `<html>`)
  - `lib/i18n/format.ts` (new — `formatNumber`, numeral guardrail per Task 4)
  - `package.json` (edit — `next-themes`, if used)
  - Any existing form component touched by Task 1's fix (if state loss is confirmed): `app/[locale]/(marketing)/sign-up/sign-up-form.tsx`, `app/[locale]/(learner)/profile/profile-form.tsx`, etc. — edit in place, no new files
  - `components/ui/{button,input,textarea}.tsx` (edit — touch target sizing, Task 6)
  - `lib/i18n/en.json`, `lib/i18n/ar.json` (edit — new `Nav` switcher labels)
- No conflicts expected — this story fills reserved slots and extends existing shared components rather than introducing parallel structures.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.6] — full story text and acceptance criteria (verbatim origin)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#Consistency-Conventions] — numerals-as-Western-digits rule, RTL/logical-properties framing
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-BMAD Test-2026-08-02/DESIGN.md] — Typography (numerals), Colors (AA contrast pre-verification), "Brand & Style" (system `prefers-color-scheme` default + manual override), UX-DR11 (touch target size, accessibility floor)
- [Source: _bmad-output/implementation-artifacts/1-0-project-scaffold-deployment-pipeline.md] — the `.dark`/`.light` override-class comment in `app/globals.css` explicitly deferring the theme-switcher UI to this story
- [Source: _bmad-output/implementation-artifacts/1-3-role-model-role-gated-navigation.md] — `site-header.tsx`'s reserved trailing slot comment explicitly naming this story
- [Source: _bmad-output/implementation-artifacts/1-1-email-password-sign-up-sign-in.md] — `lib/auth/locale.ts`'s `NEXT_LOCALE`-cookie-based email locale detection, which this story's language switcher makes end-to-end reachable
- Current repo state verified directly: `app/globals.css` (dark/light token + class mechanism), `app/[locale]/layout.tsx`, `components/nav/site-header.tsx` (reserved slot), `package.json` (no `next-themes` installed yet), `lib/i18n/navigation.ts`, `lib/i18n/en.json`
- Web-verified (Aug/Sep 2026): next-intl's documented `router.replace(pathname, {locale})` LocaleSwitcher pattern and its known, still-open state-loss limitation (`amannn/next-intl` GitHub issue #496, "Persisting state and context on locale change"); `next-intl`'s `NEXT_LOCALE` session-cookie behavior; `next-themes` as the standard FOUC-safe theme-toggle solution for Next.js (verify exact prop API against the installed version at implementation time, per this project's established practice)

## Dev Agent Record

### Agent Model Used

claude-sonnet-5 (BMAD dev-story workflow)

### Debug Log References

- **Task 1 spike (empirical, dev server + in-app browser):** `/en/sign-up` — typed `name`, `email`, `password`, clicked a minimal real language switcher → `/ar/sign-up` (`dir="rtl"`, `lang="ar"`, Arabic chrome). **All three fields came back empty** → next-intl #496 reproduces on this app's Next.js 16.2 / next-intl 4.13 (the `app/[locale]` subtree remounts on the locale param change). Fix applied → re-verified: `name`/`email` restored from `sessionStorage["form:sign-up"]` (which held only `{name,email}` — no password key), `password` correctly lost. Round-trips EN↔AR. On authenticated `/ar/profile`: edited display name survived the switch to `/en/profile` with the session intact and no reload; after a successful save the `form:profile` draft is cleared and does not resurrect on a later switch.
- **Task 3 (theme):** hand-rolled inline-script + `useSyncExternalStore` version worked but every inline `<script>` (raw in `<head>` or via `next/script beforeInteractive`) in the `[locale]` layout triggers React's dev-only "Encountered a script tag while rendering React component" on client-side locale switch, because that layout re-renders. Switched to **`next-themes@0.4.6`** (the story's recommended path; API checked against `node_modules/next-themes/dist/index.d.ts`): `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`. Verified: cycle System→Light→Dark→System sets `.light`/`.dark` on `<html>` + `color-scheme`; `bg` = `#17140f` in dark; choice persists to `localStorage["theme"]` and survives a reload with no flash (next-themes' own pre-hydration script). The dev warning still fires once per locale switch with next-themes too (its memoised `<ThemeScript>` re-renders when the layout does) — **dev-mode only, `next build` output is clean, no production impact.** Documented, not chased further (a root-layout split would break next-intl's `<html lang>` pattern).
- **Task 4 (numerals):** `grep` for `toLocaleString|NumberFormat|useFormatter|toLocaleDateString` across `app/ components/ lib/` → **zero hits**; nothing to retrofit. Probed `createTranslator({locale:'ar'})('{count} / {max} …', {count:65,max:280})` → `"65 / 280 …"` (Western digits) — next-intl bare placeholders don't localise digits, so Story 1.5's bio counter is safe. `lib/i18n/format.ts` added as the forward-looking guardrail.
- **Task 5 (a11y):** fetched + parsed `/ar`, `/ar/sign-in`, `/ar/sign-up`, `/ar/forgot-password`, `/ar/reset-password`, `/en/sign-in` and (with a throwaway session) `/ar/profile` — every `a[href]/button/input` has an accessible name (label/aria-label/text/title/placeholder), exactly one `[lang]` per document (`<html>`), nothing overrides it. `grep` for physical-direction classes (`ml-/mr-/pl-/pr-/left-/right-/text-left/text-right`) in `app/ components/` → none in app code (vendored button/badge use `has-data-[icon=inline-*]:p{l,r}` gated selectors, no current usage).
- **Task 6 (touch targets):** measured every `header`/`main` link/button/input at 375px. Undersized before fixes: brand wordmark (29px h), standalone "Forgot password?" (22px), sentence-inline "Sign up" (17px). After bumping `Button`/`Input`/nav-link sizing + the brand link + the forgot-password link: the only remaining sub-44 target is the "Don't have an account? **Sign up**" link that sits inline in a sentence (WCAG 2.5.5 inline exception). New switchers measured 44×44.
- **Task 7 (contrast):** computed WCAG ratios from resolved token values in both themes. **Dark:** every pair 5.99–15.87:1 — clean. **Light:** `text-primary`/`text-secondary` on `surface-{base,raised,sunken}` = 6.15–17.16:1 — clean. The active language-toggle label as `{colors.primary}` (per DESIGN.md's one-liner) measured **2.75:1** → changed to `{colors.text-primary}` on the raised chip (17:1) with `{colors.primary}` kept as a ring; flagged for design reconciliation. Pre-existing `primary-foreground`/`primary` (3.29:1) and `accent-foreground`/`accent` (3.66:1) button-label pairs and gold link text (3.11:1) in light mode are DESIGN.md-owned ("verified at AA for button label text at `{typography.label}` size and above") and out of scope for this pass ("No new tokens or colors — confirmation, not design work").
- `npx tsc --noEmit` clean · `npx eslint .` clean · `npx next build` succeeds (23/23 static params generated; all `[locale]` routes are `ƒ` dynamic, unchanged — `SiteHeader`'s `getSessionUser()` already forced that since Story 1.3).
- Throwaway account `story16-a11y@example.test` created via `/api/auth/sign-up/email` for the authenticated-shell checks, then hard-deleted from Neon (user row → `session`/`account` cascade; `verification` rows removed). 0 `story16-%` rows remain.

### Completion Notes List

**What shipped**

- **`components/nav/language-switcher.tsx`** (new, `"use client"`) — DESIGN.md `{components.language-toggle}`: a `rounded-full` pill on `surface-sunken`, two segments (EN / AR), the active one on a raised chip. Switches via `router.replace(\`${pathname}${window.location.search}\`, { locale })` from `lib/i18n/navigation.ts` — a client transition (no `window.location`, no reload) wrapped in `useTransition`; `window.location.search` is carried so `?token=` (`/reset-password`) and `?q=` (`/accounts`) survive. Each button carries `aria-current` + a full `aria-label` (`"Current language: English"` / `"Switch to Arabic"` — the "EN"/"AR" glyph is `aria-hidden`). Confirmed it updates the `NEXT_LOCALE` cookie (`en`→`ar`), which `lib/auth/locale.ts` reads for transactional-email locale (Story 1.1) — that mechanism is now reachable end-to-end.
- **`components/nav/theme-switcher.tsx`** (new, `"use client"`) — single cycle button (System → Light → Dark) via `next-themes`' `useTheme()`. Icon (monitor/sun/moon) + `aria-label` announce current state **and** next action; `useSyncExternalStore` hydration gate keeps SSR and first client render identical (no `setState`-in-effect). 44×44.
- **`app/[locale]/layout.tsx`** — wraps the tree in `next-themes` `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`. `<html suppressHydrationWarning>` was already present. No token-layer change — `app/globals.css`'s `.dark`/`.light` classes (Story 1.0) are exactly what `attribute="class"` drives.
- **`components/nav/site-header.tsx`** — fills the reserved trailing slot with `<LanguageSwitcher /> <ThemeSwitcher />` before the auth controls; nav links and the brand wordmark get `inline-flex min-h-11 items-center` for the touch floor.
- **`lib/i18n/locale-switch-form-state.ts`** (new, `"use client"`) — `useLocaleSwitchFormState(key, fields)` + `clearLocaleSwitchFormState(key)`. Mirrors only fields that differ from their baseline to `sessionStorage` on change, restores on the next mount, cleared on successful submit. Narrowly wired into the 4 real forms; **JSDoc forbids passing a password field.** Not a generic abstraction.
- **`lib/i18n/format.ts`** (new) — `formatNumber(value, options?)` pins `numberingSystem: "latn"` (fixed `en-US` grouping) so Epic 2+ number formatting can't regress to Eastern Arabic-Indic digits under `ar`. Import-free, single purpose (à la `BIO_MAX_LENGTH`).
- **Forms wired for AC #2:** `sign-up-form.tsx` (name, email), `sign-in-form.tsx` (email), `forgot-password-form.tsx` (email), `profile-form.tsx` (name, bio — with `initial` baselines). **`reset-password-form.tsx` is deliberately NOT wired** — its only field is the new password; per Task 1 / Dev Notes a mid-typed password lost on a language switch is the accepted, documented exception. Its `?token=` still survives via the switcher's query-string carry.
- **`components/ui/button.tsx` / `components/ui/input.tsx`** — `Button` `default`/`lg`/`icon` and `Input` raised to the ~44px touch floor (Story 1.6's documented judgment call; nothing pins a value in DESIGN.md/PRD). `xs`/`sm`/`icon-xs`/`icon-sm` kept compact for dense pointer-first surfaces (admin tooling, button groups) — opt-in only. `Textarea` reviewed, already `min-h-16` (64px) — unchanged. `sign-out-button.tsx` and `accounts/page.tsx` search button dropped their `size="sm"` so header/search controls sit at 44px.
- **`lib/i18n/en.json` / `lib/i18n/ar.json`** — new `Nav.language` (`groupLabel`, `en`, `ar`, `current`, `switchTo`) and `Nav.theme` (`label`, `system`, `light`, `dark`, `current`, `switchTo`) with localised language/theme names (`"Arabic"` / `"الإنجليزية"`). No hardcoded strings in the new controls.
- **`package.json`** — added `next-themes@^0.4.6` (Task 3's recommended library; within story scope — Project Structure Notes list this edit).

**AC status (Task 8 walkthrough):**

1. ✅ Toggling to AR on home/sign-in/sign-up/profile flips `dir="rtl"` + `lang="ar"` and re-renders all chrome (nav, buttons, forms, system messages) in Arabic; layout mirrors (logical/neutral classes only — no physical `ml/mr/left/right` in app code). Screenshot captured EN-light and AR-dark.
2. ✅ Mid-form state survives — verified on unauthenticated `/sign-up` and, most importantly, the **authenticated** `/profile` (display-name edit preserved across EN↔AR, session intact, no reload). Password fields are never mirrored (documented exception).
3. ✅ Numerals render as Western digits — next-intl bare `{count}` interpolation gives `"65 / 280"` under `ar`; no `Intl`/`toLocaleString` call sites exist; `formatNumber` guardrail added.
4. ✅ Every interactive element on all 10 pages (EN + AR) exposes a role + accessible name; single correct `<html lang>` per page.
5. ✅ Buttons/inputs/nav links/switchers meet ~44px at a 375px viewport; the lone exception is a link inline in a sentence (WCAG 2.5.5 inline exception).
6. ✅ No stored choice → follows `prefers-color-scheme` (`next-themes` `defaultTheme="system"`); manual override cycles System/Light/Dark, persists across reload, no flash.
7. ✅ Dark mode fully AA (5.99–15.87:1). Light mode `text-primary`/`text-secondary` pairs AA. Active language label fixed to 17:1. Residual light-mode `primary`/`accent` button-label and gold-link pairs (~3.1–3.7:1) are DESIGN.md-owned pre-verified pairings, flagged not changed (Task 7 scope).

**Known dev-only warning:** React logs "Encountered a script tag while rendering React component" once per client-side locale switch — `next-themes`' inline theme script re-rendering when the `[locale]` layout re-renders. `next build` is clean and React strips this `console.error` in production; no runtime/behaviour impact. Left as-is; the alternative (splitting the root layout out of `[locale]`) would break next-intl's `<html lang={locale}>` pattern.

**Flagged for design:** DESIGN.md `{components.language-toggle}` says the active label renders in `{colors.primary}`; that pairing is ~3.3:1 (below the "Colors" section's own AA floor and this story's AC #7), so the active label uses `{colors.text-primary}` with `{colors.primary}` shown as a chip ring instead.

### File List

- `components/nav/language-switcher.tsx` (new — global language toggle, `"use client"`)
- `components/nav/theme-switcher.tsx` (new — theme cycle button via `next-themes`, `"use client"`)
- `lib/i18n/locale-switch-form-state.ts` (new — `useLocaleSwitchFormState` / `clearLocaleSwitchFormState`, `"use client"`)
- `lib/i18n/format.ts` (new — `formatNumber` numeral guardrail)
- `app/[locale]/layout.tsx` (edit — `next-themes` `<ThemeProvider>` wrapping the tree)
- `components/nav/site-header.tsx` (edit — render both switchers in the trailing slot; `min-h-11` on nav links + brand)
- `components/nav/sign-out-button.tsx` (edit — drop `size="sm"` so it meets the touch floor)
- `components/ui/button.tsx` (edit — `default`/`lg`/`icon` sizes to ~44px; compact sizes documented as opt-in)
- `components/ui/input.tsx` (edit — `h-11` touch floor)
- `app/[locale]/(marketing)/sign-up/sign-up-form.tsx` (edit — `useLocaleSwitchFormState` for name/email; clear on success)
- `app/[locale]/(marketing)/sign-in/sign-in-form.tsx` (edit — `useLocaleSwitchFormState` for email; clear on success; `min-h-11` on the forgot-password link)
- `app/[locale]/(marketing)/forgot-password/forgot-password-form.tsx` (edit — `useLocaleSwitchFormState` for email; clear on success)
- `app/[locale]/(learner)/profile/profile-form.tsx` (edit — `useLocaleSwitchFormState` for name/bio with baselines; clear on success)
- `app/[locale]/(admin)/accounts/page.tsx` (edit — search button drops `size="sm"`)
- `lib/i18n/en.json` (edit — `Nav.language` + `Nav.theme` namespaces)
- `lib/i18n/ar.json` (edit — `Nav.language` + `Nav.theme` namespaces)
- `package.json` (edit — add `next-themes@^0.4.6`)
- `package-lock.json` (edit — `next-themes` lockfile entry)
- `_bmad-output/implementation-artifacts/1-6-bilingual-ui-shell-language-switcher.md` (this story: frontmatter `baseline_commit`, task checkboxes, Dev Agent Record, File List, Change Log, Status)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status → in-progress → review)

## Change Log

| Date       | Change |
|------------|--------|
| 2026-09-02 | Implemented Story 1.6: bilingual UI shell finisher. **Language switcher** (`components/nav/language-switcher.tsx`) — DESIGN.md pill toggle, `router.replace` client transition carrying the query string, full `aria-label`s, updates `NEXT_LOCALE`. **Theme switcher** (`components/nav/theme-switcher.tsx` + `next-themes@0.4.6` provider in `app/[locale]/layout.tsx`) — System/Light/Dark cycle, `prefers-color-scheme` default, `localStorage` persistence, no flash. **AC #2 spike** confirmed next-intl #496 reproduces (Next 16.2) → `lib/i18n/locale-switch-form-state.ts` mirrors non-sensitive fields to `sessionStorage` across a locale switch, wired into sign-up/sign-in/forgot-password/profile (never passwords; reset-password deliberately excluded). **Numeral guardrail** `lib/i18n/format.ts` (`formatNumber` pins `numberingSystem:"latn"`) — no existing call sites needed retrofitting. **Touch targets** — `Button`/`Input` defaults + nav links/brand + sign-out/search buttons raised to ~44px. **a11y + contrast passes** across all 10 pages in EN + AR: every control has a role + accessible name, one correct `<html lang>` per page; dark mode fully AA, light-mode text-on-surface AA, active language label moved off `{colors.primary}` (2.75:1) to `{colors.text-primary}` (flagged for design). New `Nav.language` / `Nav.theme` i18n namespaces (en + ar). `tsc` + `eslint` + `next build` clean. Known dev-only React "script tag" warning on locale switch (next-themes inline script; prod-clean). Status → review. |
| 2026-09-02 | Code-review fixes (4 findings): (1) **`theme-switcher.tsx`** — `isTheme()` guard so a stale/tampered `localStorage["theme"]` value (next-themes returns it unvalidated) can't reach `ICONS[...]`/`t(...)` and crash the header; falls back to "system", recovers on next click. Verified: `localStorage.theme="bogus"` → header renders, one click writes `"light"`. (2) **`site-header.tsx`** — `flex-wrap` + `gap-y` on the nav and inner links row so a narrow / signed-in-with-role-links viewport degrades to stacked rows instead of overflowing horizontally (inert once it fits). Verified at 375px with 4 injected role links: no page/nav horizontal overflow. (3) **`profile-form.tsx`** — added `savedName`/`savedBio` baseline state that advances the instant a save succeeds, so the persistence mirror stops writing immediately instead of racing `router.refresh()`; the post-save `clearLocaleSwitchFormState` is now actually effective. Verified: `sessionStorage["form:profile"]` stays `null` after save and across a subsequent locale switch; the unsaved-edit path still preserves the draft. (4) **`en.json`/`ar.json`** — removed the unused `Nav.theme.label` key. `tsc` + `eslint` + `next build` clean. |
