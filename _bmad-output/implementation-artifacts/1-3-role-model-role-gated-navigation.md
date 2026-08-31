---
baseline_commit: 7a7c134177582272f9663f2e08137387e14340b9
---

# Story 1.3: Role Model & Role-Gated Navigation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Learner,
I want the navigation to only show me what I'm allowed to use,
so that I'm not confused by options I can't access.

## Acceptance Criteria

1. **Given** I am signed in as a plain Learner (no Instructor or Admin grant), **when** I view any page's navigation, **then** I never see "Create a course," the My Courses authoring dashboard, or the Admin moderation console — not even in a disabled/greyed form.
2. **Given** I am signed in as a Learner without the Instructor role, **when** I navigate directly to an Instructor-only route by URL, **then** I am blocked from the Instructor surface (not just hidden from nav).
3. **Given** I am signed in as an Instructor, **when** I view navigation, **then** I see Instructor-only surfaces (My Courses, course builder) in addition to Learner surfaces.
4. **Given** I am signed in as the Admin (Ahmed), **when** I view navigation, **then** I see the Admin moderation console in addition to Learner/Instructor surfaces I hold.
5. **Given** any new account is created (email/password or social), **when** the account is created, **then** it holds the Learner role only, by default.

## Tasks / Subtasks

- [x] Task 1: Add role flags to the data model (AC: #5, supports all)
  - [x] Add `isInstructor`/`isAdmin` boolean columns (`default(false).notNull()`) to the `user` table in `lib/modules/accounts/schema.ts`, following the existing snake_case-in-DB/camelCase-in-TS pattern already used for `emailVerified`
  - [x] Declare matching `user.additionalFields` in `lib/auth/config.ts`: `isInstructor`/`isAdmin`, `type: "boolean"`, `defaultValue: false`, **`input: false`** — this is not optional. `input: false` is what stops a client from self-granting a role via a crafted `signUp`/`updateUser` payload (verified against `node_modules/better-auth/dist/db/field.d.mts`: an `additionalFields` entry is only excluded from client-writable input when `input` is explicitly `false`)
  - [x] Add the `inferAdditionalFields` client plugin to `lib/auth/client.ts` (`plugins: [inferAdditionalFields<typeof auth>()]`) so `authClient.useSession()` is typed with the new fields — confirmed available on the installed `better-auth@1.6.25` (`client/plugins/additional-fields`)
  - [x] Generate and apply the migration against the live Neon DB (same `db:generate`/`db:migrate` flow as Stories 1.0/1.1)
- [x] Task 2: Admin bootstrap — an unscoped gap in the epics, this story's judgment call (AC: #4)
  - [x] No FR or story anywhere defines how the very first Admin account is created. Story 1.4 only covers the Admin *granting/revoking Instructor*, never granting Admin itself — and there is deliberately no self-service request flow (FR-4). Without some bootstrap, this story's own Admin-only surface would be permanently unreachable by anyone
  - [x] Add an `ADMIN_EMAIL` env var (document in `.env.example`/README, same style as Story 1.0's env docs). Sync it idempotently via a Better Auth `databaseHooks.user.create` hook in `lib/auth/config.ts`: when a newly-created user's lowercased email matches `ADMIN_EMAIL`, set `isAdmin = true`. This covers every signup from this point forward, regardless of provider. **Implementation note:** used `create.before` rather than the task's `create.after` wording — `before` writes the flag in the same insert (atomic, no second round-trip, all persistence stays behind Better Auth's adapter per AD-1). Env-driven / idempotent / all-providers / in-config.ts-via-databaseHooks intent unchanged.
  - [x] Ahmed's own account(s) from Stories 1.1/1.2's manual testing already exist and predate this hook, so they won't be caught retroactively — call this out explicitly in Completion Notes: Ahmed needs one manual `db:studio` edit (or a tiny one-off idempotent script) to flip his existing row's `is_admin` to `true` after this story ships
  - [x] Do not build any self-service "become Admin" UI or request flow
- [x] Task 3: `requireRole()`/`can()` shared authorization helpers, per AD-6 (AC: all)
  - [x] New `lib/auth/authorization.ts`: `getSessionUser()` (Server-Component-only, wraps `auth.api.getSession({ headers: await headers() })`), `class AuthorizationError extends Error`, `requireRole(role: "instructor" | "admin")` (throws `AuthorizationError` on failure, never silently returns false; returns the session user on success), `can(role: "instructor" | "admin")` (returns boolean, never throws) — matches AD-6's pinned failure semantics exactly
  - [x] **Admin does not imply Instructor.** They are independent additive flags per AD-6 ("additive role flags... never separate entities" means flags stack, not that one implies another). An Admin account without its own `isInstructor` flag must **not** see or reach Instructor-only nav/routes — don't special-case Admin to bypass the Instructor check
  - [x] AD-6 phrases `can()` generically as `can(action, resource)` to leave room for future resource-level checks (e.g. Epic 2's course-ownership checks). This story only implements the role-checking overload — no resource-owning entities exist yet. A future story extending `can()` to resource-scoped checks should extend this same module, not create a second helper file
  - [x] Session freshness for AD-6's "role revoke takes effect on next request" is already correct and needs no new work: `lib/auth/config.ts` has never enabled `session.cookieCache` (confirmed by reading `node_modules/better-auth/dist/cookies/index.mjs` — cookie caching is off unless explicitly enabled), so every `getSession()` call hits the DB directly. **Do not enable `session.cookieCache`** in this story or any later one without re-deriving this guarantee
- [x] Task 4: Route-level guards (AC: #2)
  - [x] Add `app/[locale]/(instructor)/layout.tsx` and `app/[locale]/(admin)/layout.tsx`, each calling `can("instructor")` / `can("admin")` and calling Next.js's `notFound()` when false — this blocks direct-URL access regardless of what the nav shows
  - [x] Add `app/[locale]/(learner)/layout.tsx` requiring only a signed-in session (any account, no role check), redirecting to `/sign-in` when there is none — Learner surfaces need authentication, not a role flag
  - [x] These are net-new layout files — Story 1.0's placeholder pages under `(instructor)`/`(admin)`/`(learner)` currently have zero guarding, so there is no existing guard logic to preserve or conflict with
- [x] Task 5: Global role-gated navigation (AC: #1, #3, #4)
  - [x] `app/[locale]/layout.tsx` currently renders `{children}` directly with **no header or nav at all** — this story adds the first one. Build `components/nav/site-header.tsx` (Server Component, reads `getSessionUser()`), rendering: an always-visible Sanabel home link; "My Learning" when signed in; **My Courses** only when `isInstructor`; **Admin moderation console** only when `isAdmin`; Sign in/Sign up links when signed out; a minimal sign-out control when signed in (not explicitly required by the ACs, but necessary for this story's own nav to be end-to-end testable across roles/accounts — without it there is no way to leave a session). ("Create a course" CTA belongs to Story 2.1; only the existing `/courses` dashboard route is linked here.)
  - [x] Gated items must be **absent from the rendered DOM** for a disallowed viewer, never rendered-and-hidden or rendered-and-disabled (AC #1's explicit "not even in a disabled/greyed form")
  - [x] **Coordinate with Story 1.6, don't collide with it:** Story 1.6 ("Bilingual UI Shell & Language Switcher") extends this same header with the language toggle later. Build the nav shell and role-gated links now; leave room in the layout for the toggle, but do not build language-switching itself here — that's FR-33's scope, not this story's (trailing `<div>` slot in `site-header.tsx` is commented for it)
- [x] Task 6: i18n + accessibility (AC: all)
  - [x] New `Nav` namespace in `lib/i18n/en.json`/`lib/i18n/ar.json`: every link label, sign-in/out text — no hardcoded strings, matching the pattern established since Story 1.0's review
  - [x] Logical spacing (flex `gap-*`, per Story 1.2's precedent), an accessible nav landmark (`<nav aria-label="...">`), proper accessible names on every link/button
- [x] Task 7: End-to-end verification (AC: all)
  - [x] Plain Learner account (default flags): confirmed nav shows no Instructor/Admin links; confirmed direct navigation to `/en/courses` and `/en/moderation` both return 404 (`notFound()`)
  - [x] `isInstructor = true` on a test account (set via direct DB update, simulating Story 1.4's grant): confirmed My Courses appears and `/en/courses` + `/ar/courses` load (200), while `/en/moderation` remains 404
  - [x] Confirmed a signup whose email matches `ADMIN_EMAIL` gets `isAdmin = true`, `isInstructor = false`, sees the moderation link and `/en/moderation` (200); separately confirmed that same Admin (no `isInstructor`) does **not** see My Courses and gets 404 on `/en/courses` — "Admin doesn't imply Instructor" verified directly
  - [x] Confirmed brand-new sign-ups have `isInstructor`/`isAdmin` both `false` by default (email/password path tested directly; social path shares the identical `databaseHooks.user.create` + `additionalFields` defaults)
  - [x] `npm run build`, `npx tsc --noEmit`, `npm run lint` all clean; `/en` and `/ar` spot-checked (nav landmark + localized labels + locale-prefixed hrefs, signed-out and signed-in)

### Review Findings

_Adversarial code review 2026-08-31 (Blind Hunter + Edge Case Hunter + Acceptance Auditor)._

- [x] [Review][Decision] Admin bootstrap grants Admin on an unverified email — `emailAndPassword` has no `requireEmailVerification`, so an email/password sign-up creates a live session immediately. `databaseHooks.user.create.before` sets `isAdmin: true` purely on `user.email === ADMIN_EMAIL` with no proof of ownership. If `ADMIN_EMAIL` ever points at an unregistered address, whoever knows it (README/story tie it to `am161050@…`) can register it and hold Admin without verifying; `accountLinking.trustedProviders` then links the real owner's later OAuth sign-in into that row. GitHub OAuth can also return unverified primaries. [`lib/auth/config.ts:50`] — **ACCEPTED AS-IS** (Ahmed, 2026-08-31): single-admin app, `ADMIN_EMAIL` only set in Vercel Production, and `am161050@gmail.com` is already registered so the pre-registration window is currently closed. Revisit before onboarding any additional admin or changing `ADMIN_EMAIL` to a fresh address. Logged in `deferred-work.md` as an accepted risk.
- [x] [Review][Patch] Per-page guard on the instructor/admin placeholder pages — decision (Ahmed, 2026-08-31): keep layout guards **and** add defense-in-depth. Implemented with `can()` → `notFound()` (mirrors the layout exactly, no divergent error path) rather than the throwing `requireRole()`. Convention recorded inline: instructor/admin **pages and layouts** guard via `can()`/`notFound()`; **Server Actions / Route Handlers** in those groups use `requireRole()` (throws). [`app/[locale]/(instructor)/courses/page.tsx`, `app/[locale]/(admin)/moderation/page.tsx`]
- [x] [Review][Patch] Memoized `getSessionUser` with React `cache()` — SiteHeader + a guard layout now share one `auth.api.getSession` per request; cross-request freshness unaffected. [`lib/auth/authorization.ts`]
- [x] [Review][Patch] `getSessionUser` wrapped in try/catch → returns `null` on session-store failure (fail closed / signed-out) instead of 500-ing every route. `unstable_rethrow(error)` guards against swallowing Next.js control-flow signals (`headers()` static-gen bail-out, `notFound()`, `redirect()`) — caught during the fix when the naive catch broke the build. [`lib/auth/authorization.ts`]
- [x] [Review][Patch] Added exported pure `hasRole(user, role)` (type predicate `user is SessionUser`) as the single source of truth; `can()` and `site-header.tsx` both call it — header no longer reads `user.isInstructor`/`user.isAdmin` directly. [`lib/auth/authorization.ts`, `components/nav/site-header.tsx`]
- [x] [Review][Patch] `hasRole` is a type predicate — the `return user as SessionUser` cast in `requireRole` is gone. [`lib/auth/authorization.ts`]
- [x] [Review][Patch] Admin bootstrap observability — `console.warn` when the grant fires; boot-time `console.warn` if `ADMIN_EMAIL` is unset in `NODE_ENV=production`. [`lib/auth/config.ts`]
- [x] [Review][Patch] `SignOutButton` — added `catch` that `router.refresh()`es and re-enables the button; no more unhandled rejection / silent half-signed-out state. [`components/nav/sign-out-button.tsx`]
- [x] [Review][Patch] i18n label aligned — `ar.json` `Nav.moderation` "الإشراف" → "الإشراف الإداري" to match en "Admin moderation". [`lib/i18n/ar.json`]
- [x] [Review][Defer] `redirect` to `/sign-in` drops the intended destination [`app/[locale]/(learner)/layout.tsx:18`] — deferred, needs the sign-in flow to accept/honour a `callbackURL`; broader than this story
- [x] [Review][Defer] Hardcoded route-path literals in the header [`components/nav/site-header.tsx`] — deferred, codebase-wide convention (sign-in form and social buttons also hardcode paths); introduce shared route constants in a dedicated pass
- [x] [Review][Defer] Unverified-email accounts can reach gated surfaces [`app/[locale]/(learner)/layout.tsx`] — deferred, pre-existing: `requireEmailVerification` has been off app-wide since Story 1.1; a product decision, not a 1.3 regression
- [x] [Review][Defer] AC wording nits — nav label "Admin moderation" vs AC's "Admin moderation console"; single "My Courses" link vs AC #3's "My Courses, course builder" — deferred, both are intentional narrowings already documented (builder link is Story 2.1 scope)

## Dev Notes

- **This is the first story to give the app a real navigation header at all.** Every page rendered so far (Stories 1.0–1.2) is a bare placeholder or auth form with no way to reach any other page except by typing a URL. Building `site-header.tsx` and wiring it into `app/[locale]/layout.tsx` is core to this story, not incidental — the story's entire premise (role-gated *navigation*) requires navigation to exist first.
- **Route-group layouts, not middleware, are the guard mechanism.** `proxy.ts` (Story 1.0) only handles next-intl locale routing; role checks need a DB round-trip (`auth.api.getSession`), which is naturally a Server Component concern, not edge middleware. Don't move guarding into `proxy.ts` — keep it in each route group's own `layout.tsx`, consistent with how Next.js App Router expects auth gating to be composed.
- **Admin ≠ Instructor.** AD-6 defines the three roles as independent additive flags on one Account row. Nothing in the architecture or epics implies Admin inherits Instructor's surfaces automatically — Story 1.3's own AC #4 says Ahmed sees Admin *plus* "Learner/Instructor surfaces I hold" (conditional on actually holding them), not "everything." Verify this with a real test case (Task 7), don't assume it.
- **The Admin bootstrap gap is real, not an oversight in this story's scope-reading.** Re-read Epic 7 / Story 7.1 and FR-4 before second-guessing this: the epics consistently treat Ahmed as *already being* the Admin, with no story anywhere describing how that flag gets set the first time. Task 2's `ADMIN_EMAIL`-driven approach is this story's judgment call to make the system work end-to-end (per this workflow's own standing rule: a behavior required for the system to function correctly is in scope whether or not a story text says so). Do not build a UI for it — there is no FR asking for one, and building one would contradict FR-4's explicit "no self-service" framing for the adjacent Instructor case.
- **`additionalFields` + Drizzle schema must move together.** Adding `isInstructor`/`isAdmin` only to `lib/modules/accounts/schema.ts` (the Drizzle table) without also declaring them in `lib/auth/config.ts`'s `user.additionalFields` means Better Auth's session/user objects won't include them — `session.user.isInstructor` would be `undefined` even though the DB column exists. Both edits are required together. [Source: `node_modules/better-auth/dist/db/field.d.mts`, read directly on the installed `better-auth@1.6.25`]
- **Module boundary (AD-1, AD-2, AD-3) still applies:** Accounts (User, Session, Role) is the owning module; the new columns live on Better Auth's `user` table which Accounts already owns, and all reads/writes stay behind Better Auth's adapter or the new `lib/auth/authorization.ts` helpers — never a raw query from `app/` or another module.
  [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-1, #AD-2, #AD-3, #AD-6]
- **Reuse established conventions:** `components/ui/button.tsx`, DESIGN.md tokens via `app/globals.css`'s `@theme` (Story 1.0), the `Link`/`useRouter` exports from `lib/i18n/navigation.ts` (Story 1.1), and the icon-as-inline-SVG pattern from Story 1.2 if the nav needs any icons.
- **No dedicated test framework is pinned in the architecture** (same as Stories 1.0–1.2) — verification is the AC walkthrough (Task 7) plus `build`/`tsc`/`lint`.

### Project Structure Notes

- New/edited files, all within the existing structure — no new top-level directories:
  - `lib/modules/accounts/schema.ts` (edit — `isInstructor`/`isAdmin` columns) + a new `drizzle/000X_*.sql` migration
  - `lib/auth/config.ts` (edit — `user.additionalFields`, `ADMIN_EMAIL` bootstrap hook)
  - `lib/auth/client.ts` (edit — `inferAdditionalFields` plugin)
  - `lib/auth/authorization.ts` (new — `getSessionUser`, `requireRole`, `can`, `AuthorizationError`)
  - `app/[locale]/(instructor)/layout.tsx`, `app/[locale]/(admin)/layout.tsx`, `app/[locale]/(learner)/layout.tsx` (new)
  - `app/[locale]/layout.tsx` (edit — render the new `SiteHeader`)
  - `components/nav/site-header.tsx` (new)
  - `lib/i18n/en.json`, `lib/i18n/ar.json` (edit — new `Nav` namespace)
  - `.env.example`, `README.md` (edit — document `ADMIN_EMAIL` and the one-time manual bootstrap step for Ahmed's existing account)
- No conflicts expected — this story adds the app's first real navigation shell and its first route guards; nothing existing depended on their absence.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.3] — full story text and acceptance criteria (verbatim origin)
- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.4, #Epic-7] — confirms Admin-bootstrap is genuinely undefined elsewhere in the epic set
- [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-1, #AD-2, #AD-3, #AD-6, #Consistency-Conventions]
- [Source: _bmad-output/implementation-artifacts/1-2-social-login-with-google-github.md] — established auth/UI conventions this story extends (icon components, `?error=` pattern precedent for reading search params, i18n structure)
- Current repo state verified directly: `lib/modules/accounts/schema.ts`, `lib/auth/config.ts`, `lib/auth/client.ts`, `app/[locale]/layout.tsx`, `app/[locale]/(instructor)/courses/page.tsx`, `app/[locale]/(admin)/moderation/page.tsx`, `app/[locale]/(learner)/my-learning/page.tsx` (all three currently unguarded placeholders), `lib/i18n/en.json`
- Better Auth source verified directly on the installed version (`node_modules/better-auth@1.6.25`): `dist/db/field.d.mts` (`additionalFields`/`input: false` semantics), `dist/client/plugins/index.d.mts` (`inferAdditionalFields` client plugin exists), `dist/context/create-context.mjs` + `dist/cookies/index.mjs` (`session.cookieCache` defaults to disabled — DB-backed session freshness confirmed intact), `dist/api/routes/session.mjs` (`auth.api.getSession` shape)

## Dev Agent Record

### Agent Model Used

claude-sonnet-5 (BMAD dev-story workflow)

### Debug Log References

- `npm run db:generate` → `drizzle/0003_tan_forge.sql` (adds `is_instructor`, `is_admin` to `user`)
- `npm run db:migrate` → applied to Neon successfully
- `npx tsc --noEmit` → clean; `npm run lint` → clean; `npm run build` → success (all `[locale]` routes now `ƒ` dynamic — expected: `SiteHeader` reads `headers()` via `getSessionUser()`, per Dev Notes)
- Throwaway in-process verification script (`auth.api.signUpEmail` / `signInEmail` + HTTP fetch against `next dev`, 27 assertions across AC #1–#5, AD-6, and signed-out/`/ar` behaviour): **ALL PASS**. Script + its `story13-*` fixtures deleted afterwards; DB confirmed back to the single pre-existing `am161050@gmail.com` row (flags unchanged).
- Resend 422 errors during that script are pre-existing Story 1.1 behaviour (verification email send rejects `@example.com`); signup itself succeeds and is unaffected.

### Completion Notes List

**What shipped**

- `isInstructor` / `isAdmin` — additive boolean flags (AD-6) on the Accounts-owned `user` table (`lib/modules/accounts/schema.ts`) + matching Better Auth `user.additionalFields` with **`input: false`** (blocks client self-grant) in `lib/auth/config.ts`; `inferAdditionalFields<typeof auth>()` client plugin so the session user is typed. Migration `0003_tan_forge.sql` applied to Neon.
- **Admin bootstrap** (`ADMIN_EMAIL`): `databaseHooks.user.create.before` in `lib/auth/config.ts` sets `isAdmin = true` when a new account's email matches `ADMIN_EMAIL` (case-insensitive), every provider, idempotent. Deviation from the task's `create.after` wording — `before` is atomic (single insert, no second write, persistence stays behind the adapter per AD-1); stated intent unchanged. No self-service role UI (FR-4).
- `lib/auth/authorization.ts` — `getSessionUser()`, `can(role)` (boolean, never throws), `requireRole(role)` (throws `AuthorizationError`, returns user on success), `AuthorizationError`. Admin is **not** special-cased into the instructor check. `session.cookieCache` left disabled (DB-backed freshness → revoke takes effect next request).
- Route guards: `(instructor)/layout.tsx` + `(admin)/layout.tsx` → `notFound()` when `can()` is false; `(learner)/layout.tsx` → redirect to `/sign-in` when signed out.
- `components/nav/site-header.tsx` (Server Component) wired into `app/[locale]/layout.tsx` — the app's first nav header. Gated links are **absent from the DOM** for disallowed viewers. `components/nav/sign-out-button.tsx` is the only client leaf. Trailing `<div>` slot reserved (commented) for Story 1.6's language switcher.
- `Nav` i18n namespace in `en.json` / `ar.json`; `<nav aria-label>` landmark; logical `gap-*` spacing (RTL-safe).

**⚠️ Manual step required before this is live for Ahmed**

The bootstrap only fires on account **creation**. `am161050@gmail.com` predates the hook, so it is still `is_admin = false`. Flip it once via `npm run db:studio` (set `is_admin = true` on that row), and set `ADMIN_EMAIL` in `.env.local`, Vercel (Production), and GitHub Actions secrets. Documented in README under "Roles & the Admin bootstrap".

**Follow-ups / notes for review**

- Every `/[locale]` route is now dynamically rendered (was static). Unavoidable for RSC role-gated nav — accepted in the story's Dev Notes.
- `.env.local` was not modified by this story (secrets file); only `.env.example` documents the new var.

### File List

- `lib/modules/accounts/schema.ts` (edit — `isInstructor` / `isAdmin` columns)
- `drizzle/0003_tan_forge.sql` (new — migration)
- `drizzle/meta/0003_snapshot.json`, `drizzle/meta/_journal.json` (new/edit — drizzle-kit bookkeeping)
- `lib/auth/config.ts` (edit — `user.additionalFields`, `databaseHooks.user.create.before` bootstrap)
- `lib/auth/client.ts` (edit — `inferAdditionalFields` plugin)
- `lib/auth/authorization.ts` (new — `getSessionUser` [React `cache()` + try/catch/`unstable_rethrow`], `hasRole`, `can`, `requireRole`, `AuthorizationError`)
- `app/[locale]/(instructor)/layout.tsx` (new — instructor route guard)
- `app/[locale]/(admin)/layout.tsx` (new — admin route guard)
- `app/[locale]/(learner)/layout.tsx` (new — signed-in guard)
- `app/[locale]/(instructor)/courses/page.tsx` (edit — review patch: per-page `can()`/`notFound()` defense-in-depth)
- `app/[locale]/(admin)/moderation/page.tsx` (edit — review patch: per-page `can()`/`notFound()` defense-in-depth)
- `app/[locale]/layout.tsx` (edit — render `<SiteHeader />`)
- `components/nav/site-header.tsx` (new — role-gated nav shell)
- `components/nav/sign-out-button.tsx` (new — client sign-out control)
- `lib/i18n/en.json`, `lib/i18n/ar.json` (edit — `Nav` namespace)
- `.env.example` (edit — `ADMIN_EMAIL`)
- `README.md` (edit — "Roles & the Admin bootstrap" section)

## Change Log

| Date       | Change                                                                 |
|------------|-----------------------------------------------------------------------|
| 2026-08-30 | Implemented Story 1.3: role flags (`isInstructor`/`isAdmin`), `ADMIN_EMAIL` bootstrap, `lib/auth/authorization.ts` (`can`/`requireRole`), route-group guards, first site-wide role-gated navigation header, `Nav` i18n namespace. Status → review. |
| 2026-08-31 | Adversarial code review (3 layers). 1 decision accepted as-is (admin-bootstrap trust — logged as accepted risk), 1 decision → patch, 8 patches applied: `getSessionUser` memoized + fail-closed with `unstable_rethrow`, shared `hasRole()` helper, `hasRole` type predicate, bootstrap logging + prod check, `SignOutButton` catch, i18n label alignment, per-page defense-in-depth guards. 4 items deferred (pre-existing / cosmetic). `tsc` + `lint` + `build` clean; 28-assertion E2E re-run all pass. Status → done. |
