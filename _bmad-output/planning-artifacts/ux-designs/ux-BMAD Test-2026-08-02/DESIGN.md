---
name: Sanabel
description: Free, permanently-free bilingual (English/Arabic, full RTL) platform for learning to code — warm wheat-gold and grounded green, React + Tailwind loosely informed by shadcn/ui, light and dark mode.
status: final
updated: 2026-08-02
colors:
  primary: '#B8842E'
  primary-foreground: '#FFFFFF'
  primary-dark: '#E0AC5A'
  primary-foreground-dark: '#1E1B16'
  secondary: '#1F4A3D'
  secondary-foreground: '#FFFFFF'
  secondary-dark: '#5FA787'
  secondary-foreground-dark: '#0D1611'
  accent: '#D9622B'
  accent-foreground: '#FFFFFF'
  accent-dark: '#EC8A57'
  accent-foreground-dark: '#241205'
  success: '#2E7D4F'
  success-dark: '#5FAE7C'
  warning: '#9C6B12'
  warning-dark: '#D9A63C'
  error: '#C23B3B'
  error-dark: '#E2726B'
  surface-base: '#FBF8F2'
  surface-raised: '#FFFFFF'
  surface-sunken: '#F1EAD9'
  surface-base-dark: '#17140F'
  surface-raised-dark: '#211D15'
  surface-sunken-dark: '#0F0D09'
  text-primary: '#1E1B16'
  text-secondary: '#5C5548'
  text-disabled: '#A79E8E'
  text-primary-dark: '#F3EEE3'
  text-secondary-dark: '#B9AF9B'
  text-disabled-dark: '#6E6656'
  border-hairline: '#E4DAC4'
  border-hairline-dark: '#332D22'
typography:
  display:
    fontFamily: '"Inter", "IBM Plex Sans Arabic", sans-serif'
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.01em
  heading-lg:
    fontFamily: '"Inter", "IBM Plex Sans Arabic", sans-serif'
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.25'
  heading-md:
    fontFamily: '"Inter", "IBM Plex Sans Arabic", sans-serif'
    fontSize: 22px
    fontWeight: '600'
    lineHeight: '1.3'
  body:
    fontFamily: '"Inter", "IBM Plex Sans Arabic", sans-serif'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: '"Inter", "IBM Plex Sans Arabic", sans-serif'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.55'
  label:
    fontFamily: '"Inter", "IBM Plex Sans Arabic", sans-serif'
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  code:
    fontFamily: '"JetBrains Mono", monospace'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
rounded:
  sm: 6px
  DEFAULT: 8px
  md: 10px
  lg: 14px
  xl: 20px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
  '10': 40px
  '12': 48px
  '16': 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
    padding: '{spacing.3} {spacing.5}'
  button-accent:
    background: '{colors.accent}'
    foreground: '{colors.accent-foreground}'
    radius: '{rounded.md}'
    padding: '{spacing.3} {spacing.5}'
  button-secondary:
    background: 'transparent'
    foreground: '{colors.text-primary}'
    border: '{colors.border-hairline}'
    radius: '{rounded.md}'
  card:
    background: '{colors.surface-raised}'
    border: '{colors.border-hairline}'
    radius: '{rounded.lg}'
    padding: '{spacing.5}'
  input:
    background: '{colors.surface-raised}'
    border: '{colors.border-hairline}'
    radius: '{rounded.sm}'
    focusRing: '{colors.accent}'
    text: '{typography.body}'
  course-card:
    background: '{colors.surface-raised}'
    radius: '{rounded.lg}'
    titleType: '{typography.heading-md}'
    languageBadge: '{components.badge}'
    progressFill: '{colors.primary}'
  progress-bar:
    track: '{colors.surface-sunken}'
    fill: '{colors.primary}'
    radius: '{rounded.full}'
    height: '{spacing.2}'
  video-player-chrome:
    background: '#000000'
    accentControl: '{colors.accent}'
    captionToggle: '{colors.surface-raised}'
    scrubberFill: '{colors.primary}'
  code-editor:
    background: '{colors.surface-sunken}'
    backgroundDark: '{colors.surface-sunken-dark}'
    fontFamily: '{typography.code.fontFamily}'
    radius: '{rounded.md}'
    direction: 'ltr, fixed regardless of page direction'
    passState: '{colors.success}'
    failState: '{colors.error}'
  badge:
    radius: '{rounded.full}'
    background: '{colors.secondary}'
    foreground: '{colors.secondary-foreground}'
    text: '{typography.label}'
  language-toggle:
    background: '{colors.surface-sunken}'
    activeForeground: '{colors.primary}'
    radius: '{rounded.full}'
---

## Brand & Style

Sanabel (سنابل) means "ears of wheat" in Arabic — the stalks that carry the grain, the visible sign of a harvest that took time to grow. `[ASSUMPTION]` That etymology is the entire brand brief this product has: nothing in the brief or PRD names colors, typography, a logo, or reference sites, so the visual identity below is built from the name outward rather than from stated preference. Wheat gold ({colors.primary}) carries the "growth and harvest" meaning literally; a deep grounding green ({colors.secondary}) keeps the palette from reading as a food or agriculture brand by pairing gold with structure and permanence rather than sunshine.

The personality is warm, encouraging, and credible — `[ASSUMPTION]` friendly without being childish, because Sanabel's learners range from university students like Lina to working professionals like Yousef teaching what they do for a living. The product never has to perform enthusiasm (no confetti, no mascot); it earns warmth through generous space, plain language, and a restrained, confident color story. Sanabel is also a *bilingual-first* product from the ground up — Arabic is not a "translated" afterthought skin on an English design, it is a first-class rendering target, and every visual decision below (type pairing, spacing, iconography) is chosen to hold up equally in both directions.

`[ASSUMPTION]` No frontend framework or design system was specified upstream, so Sanabel is built in React + Tailwind, loosely informed by shadcn/ui defaults, with both light and dark mode supported from v1 (mode follows system `prefers-color-scheme` by default, user-overridable via the language/theme menu). Where a shadcn primitive covers a need — `Button`, `Card`, `Dialog`, `Sheet`, `Tabs`, `Badge`, `Progress`, `Tooltip`, `DropdownMenu` — Sanabel uses it with the brand-layer overrides specified under Components below, not a rebuild from scratch. This DESIGN.md documents the deltas (color, radius, bilingual type swap), not the whole component library.

## Colors

The palette is small and deliberately food-neutral: gold means "Sanabel," not "bakery."

- **Wheat Gold** (`{colors.primary}` / `{colors.primary-dark}`) is the brand color — logo mark, active nav state, primary buttons, the progress-bar fill, course-card accents. It is used wherever the product needs to say "this is Sanabel," not as a general-purpose highlight.
- **Grounding Green** (`{colors.secondary}` / `{colors.secondary-dark}`) is the structural color — badges (language tag, role tag), the Instructor-only chrome, footer, and any place the design needs weight without competing with gold's warmth. `[ASSUMPTION]` It is the "deep grounding" half of the brand direction: gold for growth, green for ground.
- **Terracotta Accent** (`{colors.accent}` / `{colors.accent-dark}`) is reserved for calls to action that drive the two core journeys forward: "Create a course," "Enroll," "Publish," "Download certificate." It's the one accent, used sparingly, so it keeps its meaning as "the next step."
- **Semantic colors** — `{colors.success}` (lesson complete, quiz/exercise pass), `{colors.warning}` (upload nearing its FR-11 cap, unsaved-risk states), `{colors.error}` (failed upload, failed grading, form validation) — sit outside the brand three and are never reused decoratively. Because the brand primary is itself warm/gold, `{colors.warning}` is deliberately desaturated and darker than `{colors.primary}` and is never shown by color alone — always paired with an icon and a text label, so a colorblind learner or an Arabic-reading skim doesn't have to infer "this is a warning" from hue.
- **Surfaces, text, and borders** ship as light/dark pairs (`{colors.surface-base}` / `{colors.surface-base-dark}`, and equivalents for `surface-raised`, `surface-sunken`, `text-primary`, `text-secondary`, `text-disabled`, `border-hairline`). Light mode reads as warm paper (`#FBF8F2`), not clinical white; dark mode is a warm near-black ink, not pure navy or pure gray, so both modes still feel like the same brand.

Contrast target: all `text-primary` / `text-secondary` pairings against their same-mode `surface-base` and `surface-raised` hold WCAG AA (4.5:1 body text, 3:1 large text) in both light and dark — `[ASSUMPTION]` this is the concrete floor behind Sanabel's accessibility posture. `{colors.primary}` on `{colors.primary-foreground}` and `{colors.accent}` on `{colors.accent-foreground}` are verified at AA for button label text at `{typography.label}` size and above.

Avoid: gradients, more than one chromatic accent live on a screen at once, and reusing `{colors.warning}` decoratively (e.g., "trending" badges) — it must always mean "pay attention to this."

## Typography

`[ASSUMPTION]` Sanabel pairs a Latin humanist sans (Inter) with a matching-weight Arabic sans (IBM Plex Sans Arabic) in the same font stack for every role — `"Inter", "IBM Plex Sans Arabic", sans-serif` — rather than swapping stylesheets per language. This means a single UI string that mixes scripts (an Arabic sentence containing an English product name, or vice versa) renders correctly without a flash of the wrong font. `{typography.code}` uses JetBrains Mono and is the one role that never swaps: code (SQL queries, fenced code blocks, the code-exercise console) always renders left-to-right and in monospace, even on an Arabic-active page — this is a hard rule carried from the PRD's RTL cross-cutting NFR, not a style preference.

Type roles: `{typography.display}` for hero/landing moments (marketing home, empty-state headlines); `{typography.heading-lg}` for page titles (course detail, course home); `{typography.heading-md}` for section and card titles (module names, course-card titles); `{typography.body}` for reading content and lesson text; `{typography.body-sm}` for secondary/meta text (timestamps, byline, comment body); `{typography.label}` for buttons, badges, and form labels; `{typography.code}` for everything code.

Arabic text at the same pixel size as Latin text tends to read visually smaller and denser due to script shape — Sanabel compensates by holding line-height at the upper end of each role's range (`{typography.body.lineHeight}` = 1.6, not 1.4) so Arabic paragraphs get enough vertical breathing room without a separate Arabic-only type scale. Numerals (lesson counts, progress percentages, timestamps, prices — though Sanabel has none) always render as Western Arabic numerals (0–9) in both languages, matching regional convention and keeping progress indicators legible at a glance regardless of active language.

## Layout & Spacing

Spacing scale is 4px-based (`{spacing.1}` through `{spacing.16}`), matching Tailwind's default rhythm so the scale needs no translation layer for engineering. `{spacing.gutter}` (24px) is the standard gap between cards in a grid (course browse grid, module list). Mobile margins default to `{spacing.margin-mobile}` (16px); desktop content areas cap their side margins at `{spacing.margin-desktop}` (48px) with a max content width so long-form lesson text and the outline editor don't stretch to full ultra-wide viewports.

**RTL is a layout requirement, not a mirroring afterthought.** Every layout is built with CSS logical properties (`margin-inline-start`, not `margin-left`) so the entire UI — course-builder outline, navigation, forms, the video player's control bar, the progress bar, comment threads, certificates — flips direction correctly when Arabic is active, per the PRD's cross-cutting bilingual-correctness NFR. Two carve-outs stay fixed regardless of page direction: the code editor / code blocks (always LTR, per Typography above) and numeral-bearing widgets like the video scrubber's elapsed-time readout (numbers read left-to-right even embedded in an RTL sentence). Icons that imply direction (back/forward chevrons, the drag-reorder handle, the "Continue" arrow) mirror horizontally in RTL; icons that don't (play/pause, checkmarks, the certificate/download icon) do not.

Mobile-web rendering is load-bearing, not a nice-to-have: FR-13 requires the Instructor's "preview as learner" mode to render mobile faithfully, so every learner-facing surface (course home, video player, quiz, code-exercise console, certificate) is designed mobile-first and verified at a narrow viewport before it's verified at desktop width.

## Elevation & Depth

Elevation stays light and infrequent `[ASSUMPTION]`, keeping dense authoring screens calm — the course-builder outline is already visually busy with nested modules and lessons, so depth cues are used to separate layers of interaction (a drag-active row, an open dialog) rather than to decorate static content. Cards (`{components.card}`) sit on `{colors.surface-raised}` against `{colors.surface-base}`, distinguished primarily by a `{colors.border-hairline}` edge; a soft, low-opacity shadow is added only on hover/drag states and inside modals/dialogs (course-builder "add lesson" dialog, the certificate-download confirmation). Flat elsewhere. Dark mode leans on tonal contrast between `{colors.surface-base-dark}` and `{colors.surface-raised-dark}` rather than shadow, since shadows read poorly against dark backgrounds.

## Shapes

`[ASSUMPTION]` Moderate rounding — friendly, not bubbly. `{rounded.sm}` (6px) for inputs and small chips; `{rounded.DEFAULT}`/`{rounded.md}` (8–10px) for buttons and the standard interactive surface; `{rounded.lg}` (14px) for cards, course-cards, and dialogs; `{rounded.xl}` (20px) reserved for large hero/marketing surfaces; `{rounded.full}` for badges, the language toggle, avatars, and the progress-bar fill/track. Nothing sharp-cornered (Sanabel is not a "tool" brand like a terminal app) and nothing pill-shaped outside of badges/toggles (Sanabel is not a consumer social app either) — the rounding sits deliberately in between.

## Components

Sanabel inherits shadcn/ui defaults for the primitives that don't need brand treatment — `Dialog`, `Sheet`, `Tabs`, `Tooltip`, `DropdownMenu`, `Toast`, `Separator`, `Skeleton` — unchanged. The components below are either shadcn primitives with brand-layer overrides, or Sanabel-specific components the library doesn't provide.

- **Button** (`{components.button-primary}`, `{components.button-accent}`, `{components.button-secondary}`) — shadcn `Button` with brand color/radius overrides. Primary (`{colors.primary}`) is the default action verb ("Save changes," "Continue"). Accent (`{colors.accent}`) follows the one-per-screen CTA rule from Colors above. Secondary is an outline/ghost treatment on `{colors.border-hairline}` for lower-emphasis actions.
- **Card** (`{components.card}`) — shadcn `Card` with `{rounded.lg}` and hairline border, used for generic grouped content (settings panels, analytics tiles).
- **Input** (`{components.input}`) — shadcn `Input`/`Textarea` with `{colors.accent}` focus ring (visible at AA contrast in both modes) and `{rounded.sm}` corners.
- **Course card** (`{components.course-card}`) — Sanabel-specific. Cover/preview thumbnail (16:9), `{typography.heading-md}` title, instructor name in `{typography.body-sm}`, a language badge (`{components.badge}`, using `{colors.secondary}`) in the corner, and — only on the "My Learning" surface — a slim `{components.progress-bar}` along the bottom edge.
- **Progress bar** (`{components.progress-bar}`) — shadcn `Progress` with `{colors.primary}` fill on a `{colors.surface-sunken}` track, `{rounded.full}`. Appears twice per enrolled course: an overall bar on course home, and per-lesson checkmarks (not the bar itself) inline in the outline.
- **Video player chrome** (`{components.video-player-chrome}`) — the Cloudflare Stream player embed's own chrome is outside Sanabel's control and styling reach `[ASSUMPTION]`; Sanabel's own control bar (speed control, caption toggle, resume indicator) wraps it using `{colors.accent}` for active/engaged controls against a fixed black background regardless of theme, matching standard video-player convention. The caption toggle surfaces Cloudflare Stream's auto-captions; captions are off by default with a one-tap toggle in the control bar.
- **Code editor** (`{components.code-editor}`) — `[ASSUMPTION]` a Monaco-style embedded editor for both authoring (Instructor writing the exercise's starter code/expected output) and taking (Learner writing their solution). Always LTR and monospace regardless of page direction. A "Run" button submits; the result panel below uses `{colors.success}` for pass and `{colors.error}` for fail, always paired with explanatory text — color is never the only signal.
- **Badge** (`{components.badge}`) — shadcn `Badge` with `{colors.secondary}` fill, `{rounded.full}`, `{typography.label}` text. Used for the course-language tag ("Taught in: Arabic" / "Taught in: English"), role tags (Instructor, Admin), and category tags on browse.
- **Language toggle** (`{components.language-toggle}`) — Sanabel-specific, lives in the global header on every surface. Switching does not reload or lose in-progress state (FR-33) — the active language's label renders in `{colors.primary}` against a `{colors.surface-sunken}` pill.

Visual reference: [mockups/key-course-home.html](mockups/key-course-home.html) and [mockups/key-outline-editor.html](mockups/key-outline-editor.html) apply these tokens to the two load-bearing surfaces, in EN/AR. This spine's frontmatter and prose are the contract; the mocks illustrate and never override it on conflict.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use `{colors.accent}` for exactly one primary action per screen | Use accent for decoration, badges, or more than one CTA at once |
| Build every layout with logical (start/end) properties so RTL flips correctly | Hard-code `left`/`right` anywhere in course-builder, nav, or the video/progress chrome |
| Keep code (blocks, console, SQL) LTR and monospace on every page, in every language | Let code inherit the page's RTL direction |
| Pair `{colors.warning}` and `{colors.error}` with an icon and label text | Rely on color alone to signal a warning or error state |
| Use one accent, restrained rounding, and light elevation to keep dense authoring screens calm | Add shadows, gradients, or a second chromatic accent to "make it pop" |
| Verify every learner-facing surface at mobile width before desktop | Treat mobile as an afterthought pass on a desktop-first design |
