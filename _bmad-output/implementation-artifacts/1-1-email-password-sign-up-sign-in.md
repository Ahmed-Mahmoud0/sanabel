---
baseline_commit: 74b3f5f4507c849c225112d1e32d80484bddd1ef
---

# Story 1.1: Email/Password Sign Up & Sign In

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to sign up and sign in with an email and password,
so that I have a persistent account on Sanabel.

## Acceptance Criteria

1. **Given** I am an unauthenticated visitor, **when** I submit the sign-up form with a valid, unused email and password, **then** an Account is created with the Learner role, I am signed in, and a verification email is sent to my address.
2. **Given** I have just signed up, **when** I have not yet clicked the verification link, **then** my account exists and I can use the product as a Learner, but it is not yet eligible for social-login merge (Story 1.2).
3. **Given** I submit the sign-up form with an email that already has an account, **when** the form is submitted, **then** I see a clear rejection message and a link into the sign-in form instead.
4. **Given** I am a registered user who forgot my password, **when** I request a password reset with my email, **then** I receive a reset email and can set a new password, after which I can sign in with it.
5. **Given** I enter an incorrect email/password combination, **when** I submit the sign-in form, **then** I see a clear error message and remain on the sign-in form.

## Tasks / Subtasks

- [x] Task 1: Add transactional email sending — Resend + React Email (AC: #1, #4)
  - [x] Install `resend` and React Email deps (`@react-email/components`); add `RESEND_API_KEY` to `.env.example`/README env docs
  - [x] Create `emails/verify-email.tsx` and `emails/reset-password.tsx` React Email templates. Keep them simple (logo/name, message, one button linking to the verify/reset URL) — no need to replicate the full DESIGN.md component system, but do NOT hardcode English-only copy (see Task 7) and DO respect RTL: use logical spacing and `dir` on the outer container driven by the locale the action was triggered from
  - [x] Wire `lib/auth/config.ts`: add `emailVerification: { sendOnSignUp: true, sendVerificationEmail: async ({ user, url }) => { ...Resend send... } }` and `emailAndPassword: { enabled: true, sendResetPassword: async ({ user, url }) => { ...Resend send... } }`. Do **not** set `requireEmailVerification: true` — AC #2 requires unverified accounts to remain fully usable as a Learner
- [x] Task 2: Add missing shadcn/ui form primitives (AC: all)
  - [x] Run `npx shadcn@latest add input label form` (or equivalent) to add primitives in the project's existing `base-nova` style — do not hand-roll a plain `<input>`; Story 1.0 already established the shadcn/ui + Base UI (not Radix) convention in `components.json`
- [x] Task 3: Sign-up form (AC: #1, #2, #3)
  - [x] Add `app/[locale]/(marketing)/sign-up/page.tsx` — the `(marketing)` route group already hosts pre-auth, public surfaces (Story 1.0's source tree comment: "public: home, browse, course detail (pre-signup)"); no new route group needed
  - [x] Fields: email, password, **and display name** — Better Auth's `user.name` column is `NOT NULL` (`lib/modules/accounts/schema.ts:6`) and `authClient.signUp.email()` requires a `name` argument, even though full profile editing (FR-5) is Story 1.5's scope. Label it something like "Display name" so it reads naturally even though its dedicated settings UI doesn't exist yet
  - [x] Normalize the email to lowercase (`email.trim().toLowerCase()`) before calling `authClient.signUp.email({ email, password, name })` — see Dev Notes on case-sensitivity
  - [x] On success: user is signed in (Better Auth sets the session cookie automatically on sign-up) — redirect into the product (e.g., locale home or `/my-learning`); verification email was sent server-side by Task 1's `sendVerificationEmail` hook
  - [x] On duplicate-email error (Better Auth's sign-up error when the email already exists — confirm the exact error code against the installed `better-auth@1.6.25`, expected around `USER_ALREADY_EXISTS`): show an inline rejection message (icon + text, never color alone — UX-DR9) with a link to `/sign-in`
- [x] Task 4: Sign-in form (AC: #5)
  - [x] Add `app/[locale]/(marketing)/sign-in/page.tsx`; fields: email, password
  - [x] Call `authClient.signIn.email({ email: email.trim().toLowerCase(), password })`; on failure show a generic "incorrect email or password" inline error (icon + text) and keep the user on the form — never reveal whether the email exists (standard credential-enumeration guard)
- [x] Task 5: Password reset flow (AC: #4)
  - [x] Add a "Forgot password?" link on the sign-in form to a request page; call `authClient.forgetPassword({ email, redirectTo: "/reset-password" })`
  - [x] Add `app/[locale]/(marketing)/reset-password/page.tsx` reading Better Auth's token query param and calling `authClient.resetPassword({ newPassword, token })`
  - [x] After a successful reset, link/redirect to `/sign-in`; verify signing in with the new password works
- [x] Task 6: Case-insensitive duplicate-signup rejection (AC: #3) — **carried over from Story 1.0's code review, explicitly deferred to this story**
  - [x] `user.email` currently has only a case-sensitive DB `unique()` constraint (`lib/modules/accounts/schema.ts:7`), so `Ahmed@x.com` and `ahmed@x.com` could both register. Client-side lowercasing (Tasks 3–4) covers the normal UI path; as defense-in-depth, add a case-insensitive unique index in Drizzle (e.g. a functional index on `lower(email)`) via a new migration, and confirm it survives a raw duplicate-insert attempt with mismatched casing
- [x] Task 7: i18n + accessibility for all new UI (AC: all)
  - [x] Add an `Auth` namespace to `lib/i18n/en.json`/`lib/i18n/ar.json` covering every new string (labels, buttons, both error messages, both email templates) — no hardcoded strings (Story 1.0's review caught exactly this mistake once already)
  - [x] Build every new form/page with logical Tailwind properties (`ms-`/`me-`, not `ml-`/`mr-`) so it flips correctly under `/ar`
  - [x] Every error/warning state pairs an icon with text (UX-DR9); every field has a proper `<label>`/accessible name; form submission status changes are announced via `aria-live` where appropriate (UX-DR11)
- [x] Task 8: End-to-end verification (AC: all)
  - [x] Walk all 5 ACs manually against a real Neon DB + real Resend send (or Resend's test/sandbox mode) in both `/en` and `/ar`: sign up → verification email arrives → account usable unverified → duplicate sign-up rejected → forgot password → reset → sign in with new password → wrong-credential sign-in rejected
  - [x] `npm run build`, `npx tsc --noEmit`, `npm run lint` all clean

### Review Findings

- [x] [Review][Defer] Email send failures (verification/reset) are silently swallowed — sign-up and forgot-password always report success to the user even when Resend never actually sent the email, with no retry/alerting/observability. better-auth runs `sendVerificationEmail`/`sendResetPassword` via `runInBackgroundOrAwait`, which only logs a failure and swallows it. [lib/auth/config.ts, lib/auth/send-email.tsx] — deferred: no logging/alerting infra exists in this project yet to build real observability on top of; Ahmed chose to accept the gap for now rather than scope a partial fix, matching Story 1.0's precedent for the Neon-teardown gap
- [x] [Review][Defer] `EMAIL_FROM` defaults to Resend's sandbox sender (`onboarding@resend.dev`), which can only deliver to the Resend account owner's own inbox — if this ships to production without a verified custom domain, every real user's verification/reset email silently fails. [.env.example, lib/auth/send-email.tsx] — deferred: no verified custom sending domain set up yet; documented as a pre-launch checklist item rather than blocking this story
- [x] [Review][Patch] Password reset doesn't revoke existing sessions — `emailAndPassword.revokeSessionsOnPasswordReset` is unset (defaults off), so an attacker's active session survives a legitimate password reset [lib/auth/config.ts]
- [x] [Review][Patch] Locale detection for transactional emails relies on fragile `Referer`-header sniffing when next-intl already sets a reliable `NEXT_LOCALE` cookie on every request via its own middleware [lib/auth/locale.ts]
- [x] [Review][Patch] All 4 auth forms: a network-level fetch failure rejects instead of resolving `{error}` (verified: better-fetch's core `fetch()` call is unwrapped), leaving `pending` stuck `true` forever with no user feedback [app/[locale]/(marketing)/sign-up/sign-up-form.tsx, sign-in/sign-in-form.tsx, forgot-password/forgot-password-form.tsx, reset-password/reset-password-form.tsx]
- [x] [Review][Patch] Reset-password page: visiting with no `token` and no `error` param leaves the submit button silently disabled with zero explanation [app/[locale]/(marketing)/reset-password/reset-password-form.tsx]
- [x] [Review][Patch] `getLocaleFromRequest`: the `request.headers.get(...)` call sits outside the try/catch, so a non-standard `headers` object would throw uncaught [lib/auth/locale.ts:6]
- [x] [Review][Patch] `EMAIL_FROM` empty-string doesn't fall back to the default because `??` doesn't catch falsy-but-defined values [lib/auth/send-email.tsx:17]
- [x] [Review][Patch] Display name isn't trimmed before being sent to sign-up (email already is) [app/[locale]/(marketing)/sign-up/sign-up-form.tsx]
- [x] [Review][Patch] No `<Suspense>` fallback around `ResetPasswordForm` causes a blank flash while `useSearchParams()` resolves [app/[locale]/(marketing)/reset-password/page.tsx]
- [x] [Review][Patch] `@react-email/render` is an unexplained top-level dependency (never directly imported in app code) — a future dependency-pruning pass could delete it and silently reintroduce the render failure it was added to fix [package.json, lib/auth/send-email.tsx]
- [x] [Review][Defer] Expired/reused email-verification links redirect to the locale home page with `?error=` unread — no feedback, no resend affordance [app/[locale]/(marketing)/page.tsx] — deferred, out of this story's file scope (Story 1.0 file)
- [x] [Review][Defer] Concurrent identical-case duplicate sign-ups can surface as a generic error without the sign-in link, because better-auth's own `createUser` catch-block collapses any DB conflict to `FAILED_TO_CREATE_USER` rather than `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` [lib/auth/config.ts] — deferred, pre-existing gap in better-auth's own error mapping, not introduced by this story's case-insensitive index
- [x] [Review][Defer] AR/EN locale-detection parity for transactional emails wasn't exercised end-to-end through a real Arabic email send during manual QA — only verified via direct template rendering with a `locale` prop, separately verified `/ar` UI pages, and (post-patch) a unit-level check of `getLocaleFromRequest`'s cookie/referer/fallback branches; no live `/ar` sign-up → real email round trip was run [Dev Agent Record] — deferred, low risk given the unit-level verification, but a live Arabic send would be the final confirmation

## Dev Notes

- **Scope boundary — do not build these here:** the actual Learner/Instructor/Admin role *flags* and role-gated navigation are Story 1.3's job (AD-6 says roles are additive flags on the Account row — none exist yet beyond the implicit "no flags = Learner" default). AC #1's "created with the Learner role" is satisfied automatically by an account simply having no Instructor/Admin flag — do not add role columns in this story. Likewise, `requireRole()`/`can()` (AD-6) are Story 1.3's deliverable, not this one's.
- **Social-login merge groundwork:** AC #2 exists because Story 1.2 will read `user.emailVerified` (already a column, `lib/modules/accounts/schema.ts:8`, defaults `false`) to decide whether a Google/GitHub sign-in on the same email should merge into this account or create a separate one. This story does not implement merge logic — it only needs to ensure `emailVerified` flips to `true` correctly when the verification link is clicked (Better Auth's built-in verify-email handler, already reachable through the catch-all route from Story 1.0, sets this) and that an unverified account remains fully functional otherwise.
  [Source: _bmad-output/planning-artifacts/epics.md#Story-1.2]
- **Module boundary (AD-1, AD-3) still applies:** all of this is Better Auth's own Route Handler (`app/api/auth/[...all]/route.ts`, already scaffolded) plus client-side `authClient` calls from `app/`. Do not add a hand-written Server Action that queries `user`/`account`/`session` directly — Better Auth's adapter is the only writer to those tables, consistent with AD-2 (Accounts module owns User/Session/Role).
  [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-1, #AD-2, #AD-3]
- **Email is a first-class RTL surface, not an afterthought.** NFR6 explicitly names "transactional emails" alongside the course-builder and video player as surfaces requiring correct RTL rendering — this is easy to miss since email templates are a separate rendering pipeline (React Email) from the rest of the app. Render the verification/reset emails with `dir="rtl"` and right-aligned layout when triggered from the `ar` locale.
  [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#Consistency-Conventions (NFR6 reference); _bmad-output/planning-artifacts/epics.md NFR6]
- **Case-sensitivity is a known, documented gap, not a hypothetical.** Story 1.0's code review found `user.email`'s DB constraint is case-sensitive and explicitly deferred fixing it to this story (`_bmad-output/implementation-artifacts/deferred-work.md`). Better Auth itself has had real case-normalization inconsistencies across its own flows (email-OTP and SAML plugins both had GitHub issues on this in 2026) — don't assume the library normalizes for you. Normalize client-side on every submit AND add the DB-level case-insensitive index as defense-in-depth (Task 6). [Source: Better Auth GitHub issues #8561, #7052, verified via web search Aug 2026]
- **Better Auth config shape (v1.6.x, matches the installed `better-auth@1.6.25`):** `emailAndPassword: { enabled: true, sendResetPassword: async ({ user, url }) => {...} }` and a top-level `emailVerification: { sendOnSignUp: true, sendVerificationEmail: async ({ user, url }) => {...} }`. Leave `requireEmailVerification` unset/false. [Source: better-auth.com/docs/authentication/email-password, better-auth.com/docs/concepts/email — verified via web search Aug 2026; cross-check against `node_modules/better-auth/dist/*.d.ts` if the API has moved, same as Story 1.0 had to do for `advanced.database.generateId`]
- **Design tokens + shadcn convention:** use the existing `components.json` (`style: "base-nova"`, Base UI primitives + CVA, `rtl: true`) — add new primitives via `npx shadcn@latest add`, don't hand-write Radix-style components. Route every color/typography/spacing value through the DESIGN.md tokens already wired into `app/globals.css`'s `@theme` (Story 1.0) — no new hex codes or px values.
  [Source: _bmad-output/implementation-artifacts/1-0-project-scaffold-deployment-pipeline.md Debug Log; ux-designs/ux-BMAD Test-2026-08-02/DESIGN.md]
- **Consistency conventions still apply:** if any custom Server Action is added (should not be necessary for this story — see above), it must return `{ok: true, data} | {ok: false, error: {code, message}}`, never throw across the client boundary.
  [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#Consistency-Conventions]
- **No dedicated test framework is pinned in the architecture.** Verification for this story is the AC walkthrough itself (Task 8) plus `build`/`tsc`/`lint`, matching how Story 1.0 was verified — there is no Jest/Vitest/Playwright-for-tests setup yet to plug into.

### Project Structure Notes

- New files live under the existing structure — no new top-level directories needed:
  - `app/[locale]/(marketing)/sign-up/page.tsx`, `.../sign-in/page.tsx`, `.../reset-password/page.tsx` (new)
  - `emails/verify-email.tsx`, `emails/reset-password.tsx` (new; `emails/index.ts` stub already exists from Story 1.0)
  - `lib/auth/config.ts` (edit — add `emailVerification`/`sendResetPassword`)
  - `lib/i18n/en.json`, `lib/i18n/ar.json` (edit — new `Auth` namespace)
  - `lib/modules/accounts/schema.ts` + a new `drizzle/000X_*.sql` migration (edit — case-insensitive email index)
  - `components/ui/{input,label,...}.tsx` (new, via shadcn CLI, not hand-written)
- No conflicts expected — this is the first story to add real routes under `(marketing)` beyond the Story 1.0 placeholder home page.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.1] — full story text and acceptance criteria (verbatim origin)
- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.2] — social-login merge logic this story's `emailVerified` handling feeds
- [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-1, #AD-2, #AD-3, #AD-6, #Consistency-Conventions]
- [Source: _bmad-output/implementation-artifacts/1-0-project-scaffold-deployment-pipeline.md] — Dev Agent Record (Debug Log, Completion Notes, File List) and Review Findings/deferred items this story must account for
- [Source: _bmad-output/implementation-artifacts/deferred-work.md] — case-sensitive email constraint explicitly deferred here
- Current repo state verified directly: `lib/modules/accounts/schema.ts`, `lib/auth/config.ts`, `lib/auth/client.ts`, `app/[locale]/layout.tsx`, `lib/i18n/en.json`, `components.json`, `package.json`, `.env.example`, `README.md`
- Web-verified (Aug 2026): Better Auth `emailAndPassword.sendResetPassword` / `emailVerification.sendVerificationEmail` config shape — [Email & Password | Better Auth](https://better-auth.com/docs/authentication/email-password), [Email | Better Auth](https://better-auth.com/docs/concepts/email); case-normalization caveats — [better-auth/better-auth#8561](https://github.com/better-auth/better-auth/issues/8561), [better-auth/better-auth#7052](https://github.com/better-auth/better-auth/issues/7052)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- shadcn's `form` registry item resolves to an empty stub (`{ "name": "form", "type": "registry:ui" }`, no `files`) for the installed `base-nova` style — confirmed by fetching `https://ui.shadcn.com/r/styles/base-nova/form.json` directly. `npx shadcn add form` is therefore a legitimate no-op, not a misconfiguration. Built `components/auth/field.tsx`/`components/auth/form-message.tsx` on the installed `Input`/`Label` primitives instead of pulling in an unrequested `react-hook-form` dependency.
- The story text's `authClient.forgetPassword({ email, redirectTo })` doesn't exist on the installed `better-auth@1.6.25`. Verified via `node_modules/better-auth/dist/api/routes/password.mjs` (`createAuthEndpoint("/request-password-reset", ...)`) and `node_modules/better-auth/dist/client/path-to-object.d.mts`'s `PathToObject`/`CamelCase` mapping: the client method is `authClient.requestPasswordReset(...)`. Used that instead.
- The story text's duplicate-signup error code `USER_ALREADY_EXISTS` doesn't match the actual thrown code. Verified via `node_modules/better-auth/dist/api/routes/sign-up.mjs` and `node_modules/@better-auth/core/dist/error/codes.mjs`: the real code is `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`. Branch on that instead.
- Confirmed sign-in returns the same generic `INVALID_EMAIL_OR_PASSWORD` code whether the email doesn't exist or the password is wrong (`node_modules/better-auth/dist/api/routes/sign-in.mjs`), so the client shows one generic message unconditionally — satisfies the credential-enumeration guard without needing to branch on the code.
- Next.js 16 renamed `middleware.ts` → `proxy.ts` (already done in Story 1.0; `proxy.ts` wraps `next-intl/middleware`). Confirmed it's active (`ƒ Proxy (Middleware)` in the build output) but still pass explicit locale-prefixed `callbackURL`/`redirectTo` on every Better Auth client call for precision, since the proxy only handles top-level locale detection/redirects, not action-specific callback targets.
- Server-side email callbacks (`sendVerificationEmail`/`sendResetPassword`) receive Better Auth's raw `Request`, not a locale — derived the locale from the `Referer` header of that same-origin POST (reliably sent for same-origin requests regardless of referrer-policy), falling back to the default locale (`lib/auth/locale.ts`).
- `new Resend(apiKey)` throws synchronously when the key is empty/unset, which crashed `next build`'s route page-data collection (it imports `app/api/auth/[...all]/route.ts` without ever calling the handler). Fixed by lazily constructing the Resend client inside the send functions instead of at module scope (`lib/auth/send-email.tsx`).
- Resend's `react:` send option dynamically `import()`s `@react-email/render` at runtime; installing only `resend` + `@react-email/components` left it nested under `node_modules/@react-email/components/node_modules/@react-email/render`, unreachable from `node_modules/resend`'s own module resolution (`Failed to render React component` error, reproduced live). Fixed by adding `@react-email/render` as an explicit top-level dependency so npm hoists it.
- Added the case-insensitive unique index via a real Drizzle migration (`drizzle/0002_wide_white_queen.sql`) applied to the live Neon DB, then confirmed with a raw duplicate insert (mismatched casing) that it's rejected with `duplicate key value violates unique constraint "user_email_lower_idx"`.

### Completion Notes List

- All 5 ACs manually verified end-to-end against the real Neon DB via a running dev server: sign-up creates the account, signs the user in, and redirects to `/my-learning` while still unverified (AC1/AC2); re-submitting the same email (including a different casing) is rejected with the duplicate-email message and sign-in link (AC3); wrong credentials show the generic error and keep the user on the form, correct credentials succeed (AC5); the full forgot-password → email → reset-password → sign-in-with-new-password round trip was driven end-to-end by pulling the real verification token out of the `verification` table and hitting the actual reset-password route (AC4).
- Real email delivery confirmed live: after Ahmed supplied a Resend API key, both the sign-up verification email and the forgot-password reset email were sent through the real flows, and Ahmed confirmed both arrived in his inbox.
- Both `/en` and `/ar` spot-checked for all four new pages: correct `dir`/`lang`, fully translated copy, no hardcoded strings found by a grep sweep of the new files. Both email templates were also independently rendered via `@react-email/render` to confirm `dir="rtl"`/`dir="ltr"` and translated copy resolve correctly per locale.
- `npm run build`, `npx tsc --noEmit`, `npm run lint` all clean. No automated test framework is pinned in the architecture yet (per Dev Notes), so verification is this build/typecheck/lint gate plus the manual AC walkthrough above, consistent with Story 1.0's precedent.
- Test data (temporary accounts, sessions, and verification tokens created during manual verification) was deleted from the live Neon database after each check; no leftover test rows remain.
- Deviations from the story's literal task text (see Debug Log References for the exact API-shape corrections against installed `better-auth@1.6.25`): `authClient.requestPasswordReset` instead of the non-existent `authClient.forgetPassword`; `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` instead of `USER_ALREADY_EXISTS`.

### File List

- `package.json`, `package-lock.json` — added `resend`, `@react-email/components`, `@react-email/render` dependencies
- `.env.example` — documented `RESEND_API_KEY`/`EMAIL_FROM`
- `README.md` — documented Resend env var setup
- `lib/auth/config.ts` — wired `emailVerification.sendVerificationEmail` and `emailAndPassword.sendResetPassword` to the new send-email helper
- `lib/auth/locale.ts` — new: derives `en`/`ar` locale from a Better Auth callback's `Referer` header
- `lib/auth/send-email.tsx` — new: lazy Resend client, sends the two React Email templates with the right subject/locale
- `emails/verify-email.tsx`, `emails/reset-password.tsx` — new: React Email templates, RTL-aware, copy sourced from `lib/i18n/*.json` (no hardcoded strings)
- `emails/index.ts` — re-exports the two new email components
- `lib/modules/accounts/schema.ts` — added `user_email_lower_idx` case-insensitive unique index on `lower(email)`
- `drizzle/0002_wide_white_queen.sql`, `drizzle/meta/0002_snapshot.json`, `drizzle/meta/_journal.json` — migration for the new index, applied to the live Neon DB
- `lib/i18n/en.json`, `lib/i18n/ar.json` — new `Auth` namespace: sign-up, sign-in, forgot-password, reset-password, and both email templates
- `components/ui/input.tsx`, `components/ui/label.tsx` — new, via `npx shadcn add` (base-nova style)
- `components/auth/field.tsx` — new: labeled input + inline icon+text error, wired for `aria-invalid`/`aria-describedby`
- `components/auth/form-message.tsx` — new: top-level success/error banner with icon + `aria-live`
- `app/[locale]/(marketing)/sign-up/page.tsx`, `.../sign-up/sign-up-form.tsx` — new: sign-up page + client form (AC1–AC3)
- `app/[locale]/(marketing)/sign-in/page.tsx`, `.../sign-in/sign-in-form.tsx` — new: sign-in page + client form (AC5)
- `app/[locale]/(marketing)/forgot-password/page.tsx`, `.../forgot-password/forgot-password-form.tsx` — new: password-reset request page + client form (AC4)
- `app/[locale]/(marketing)/reset-password/page.tsx`, `.../reset-password/reset-password-form.tsx` — new: password-reset completion page + client form, reads Better Auth's `token` query param (AC4)
- `.claude/launch.json` — new: dev-server launch config used to manually verify the feature in a browser

### Change Log

| Date | Change |
| --- | --- |
| 2026-08-04 | Tasks 1–8 implemented and verified. Email/password sign-up, sign-in, and password-reset flows shipped (Resend + React Email, i18n, accessibility, case-insensitive email defense-in-depth). All 5 ACs manually verified end-to-end against the real Neon DB and a real Resend send (Ahmed confirmed both emails arrived). `npm run build`, `npx tsc --noEmit`, `npm run lint` all clean. Story moved to `review`. |
| 2026-08-04 | Code review (3-layer adversarial): 9 patch findings applied and verified (session revocation on password reset, cookie-based locale detection replacing fragile Referer-sniffing, network-failure handling on all 4 forms, reset-password no-token UX fix, defensive try/catch widening, `EMAIL_FROM` falsy-fallback fix, display-name trimming, Suspense fallback, dependency-comment), 3 deferred to `deferred-work.md` (silent email-send failures, sandbox-only `EMAIL_FROM`, and 2 more scoped/out-of-scope gaps — see Review Findings), 8 dismissed as noise/false positives (including one finding that contradicted an explicit spec requirement). Full regression (build/typecheck/lint) clean after fixes; spot-verified the trim fix and the new cookie-based locale detection live. Story moved to `done`. |

### File List
