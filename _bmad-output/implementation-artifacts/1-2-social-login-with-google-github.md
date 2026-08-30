---
baseline_commit: 683209258a289b910cfae15fcac706459292b489
---

# Story 1.2: Social Login with Google & GitHub

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor,
I want to sign up and sign in using my Google or GitHub account,
so that I don't need to create and remember a new password.

## Acceptance Criteria

1. **Given** I am an unauthenticated visitor with no existing Sanabel account, **when** I complete Google or GitHub OAuth sign-in, **then** a new Account is created with the Learner role, using the email and display name from the OAuth provider.
2. **Given** I have an existing email/password account with a **verified** email, **when** I sign in via Google or GitHub using that same email, **then** I am signed into the same existing Account, not a new duplicate one.
3. **Given** I have an existing email/password account with an **unverified** email, **when** someone signs in via Google or GitHub using that same email, **then** a separate account is created rather than auto-merging, closing the pre-registration account-takeover path.
4. **Given** I am signed in via a social provider, **when** I view my account, **then** my role (Learner by default) and profile basics behave identically to an email/password account.

## Tasks / Subtasks

- [x] Task 1: Provision and wire real Google/GitHub OAuth credentials (AC: #1, #2, #3, #4)
  - [x] Create a Google OAuth 2.0 Client (Google Cloud Console) and a GitHub OAuth App (GitHub Developer Settings) — this is a manual, external action Ahmed needs to do, same category as Story 1.0's Neon/Vercel provisioning
  - [x] Redirect/callback URIs, per environment: `{BETTER_AUTH_URL}/api/auth/callback/google` and `{BETTER_AUTH_URL}/api/auth/callback/github` (Better Auth's catch-all route from Story 1.0, `app/api/auth/[...all]/route.ts`, already serves this path — nothing new to add there). Register at minimum `http://localhost:3000/api/auth/callback/{google,github}` and the production URL's equivalent; Vercel preview URLs are per-deploy and dynamic, so social login realistically won't work on previews yet — note this as a known gap, don't try to solve wildcard preview OAuth in this story
  - [x] Set real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` in `.env.local`, Vercel env vars, and GitHub Actions secrets — all four env var names already exist in `.env.example`/`lib/auth/config.ts` from Story 1.0, only the values are currently placeholder — confirmed working end-to-end against production (Vercel env vars are set); GitHub Actions secrets not independently confirmed but not required for CI to pass (README: only `DATABASE_URL` is strictly required for the build)
- [x] Task 2: Confirm Better Auth's account-linking security default is intact — do not weaken it (AC: #2, #3)
  - [x] `lib/auth/config.ts` currently has no `account.accountLinking` block at all, so Better Auth's default applies: `requireLocalEmailVerified` defaults to `true` (verified by reading `node_modules/better-auth/dist/oauth2/link-account.mjs` directly on the installed `better-auth@1.6.25` — see Dev Notes). **Do not** add `account.accountLinking.requireLocalEmailVerified: false` or `disableImplicitLinking: true`, and do not disable `account.accountLinking.enabled` — any of those would silently reopen the pre-registration account-takeover path AC #3 exists to close
  - [x] Optional, safe addition: `account.accountLinking.trustedProviders: ["google", "github"]` — confirmed by reading the same source file that `trustedProviders` only affects whether the *provider's* own verified-email claim is trusted; it does not bypass the local-account `emailVerified` check
- [x] Task 3: Social sign-in/sign-up buttons (AC: #1, #2, #4)
  - [x] Add `components/auth/social-buttons.tsx`: "Continue with Google" / "Continue with GitHub", rendered on **both** `/sign-up` and `/sign-in` — Better Auth's `authClient.signIn.social({ provider })` transparently creates a new account or signs into an existing one, so no separate "social sign-up" code path is needed
  - [x] `lucide-react` (already a dependency) ships a `Github` icon but no Google logo (Google's brand guidelines exclude it from generic icon packs) — add a small inline Google "G" SVG as its own icon component rather than pulling in a new icon-library dependency for one glyph — **DEVIATION**: installed `lucide-react@1.28.0` ships no `Github` icon either (brand icons removed from this major version); added a matching custom `GithubIcon` too, see Debug Log
  - [x] Call shape (verified against the installed SDK, `node_modules/better-auth/dist/api/routes/sign-in.mjs`): `authClient.signIn.social({ provider: "google" | "github", callbackURL, errorCallbackURL })` — build both as locale-prefixed paths using `getPathname` from `@/lib/i18n/navigation` + the current locale (from `useLocale()`), e.g. `callbackURL` → `/my-learning` resolved for the active locale (matching where `sign-in-form.tsx` already redirects on success), `errorCallbackURL` → the current page itself (`/sign-in` or `/sign-up`) so the error can be read back on return
- [x] Task 4: Handle the OAuth error return path (AC: #3)
  - [x] On both `/sign-in` and `/sign-up`, read an `?error=` search param on mount (wrap in `<Suspense>` per `useSearchParams()` — Story 1.1's review already caught a missing-Suspense bug on `reset-password`, don't repeat it) and surface it through the existing `components/auth/form-message.tsx` (icon + text, `aria-live`, already built)
  - [x] Map `account_not_linked` to a clear, actionable message — see Dev Notes below for why this is the real behavior, not "a second account gets created": something like "This email already has an account. Sign in with your password, or verify that account's email first, then try again." with a link to `/sign-in`
  - [x] Handle at least one generic fallback for any other `error` value (e.g. missing/misconfigured credentials surfacing as `oauth_provider_not_found` during local dev before Task 1's real credentials are set) with the existing `genericError` copy pattern
- [x] Task 5: i18n + accessibility (AC: all)
  - [x] Extend the `Auth` namespace in `lib/i18n/en.json`/`lib/i18n/ar.json` with a `social` group (button labels, an "or" divider, `accountNotLinkedError`, generic OAuth error) — no hardcoded strings, matching the pattern already established across every prior Auth string
  - [x] Buttons and icons use logical spacing (`ms-`/`me-`); Google/GitHub icons are decorative (`aria-hidden`) with the button's own accessible name carrying the label; verify in both `/en` and `/ar` — implemented with flexbox `gap-*` instead of literal `ms-`/`me-` utilities (direction-agnostic by construction, same RTL-safety goal); verified in-browser on both `/en` and `/ar`
- [x] Task 6: End-to-end verification (AC: all)
  - [x] AC #1: no prior account, sign in with Google (or GitHub) → new `user` row created, `emailVerified` matches the provider's claim, signed in, redirected — verified by Ahmed against production (https://sanabel-six.vercel.app)
  - [x] AC #2: create a normal email/password account, click its verification link (Story 1.1 flow), then sign in via Google/GitHub with the same email → still exactly **one** `user` row; a second `account` row (providerId=google) is now linked to it; signed into that same account — verified by Ahmed against production
  - [x] AC #3: create an email/password account and deliberately **do not** verify it, then attempt Google/GitHub sign-in with that same email → sign-in is rejected (redirected to `errorCallbackURL` with `?error=account_not_linked`), the UI shows the mapped message, and confirm no new/duplicate `user` row was created and the original unverified account is untouched — verified by Ahmed against production
  - [x] AC #4: spot-check a social-created account has the same shape (no role columns yet, per Story 1.1's precedent) as a password-created one — structurally guaranteed (shared `user` table), and consistent with AC #1–#3 results above
  - [x] `npm run build`, `npx tsc --noEmit`, `npm run lint` clean; spot-check both `/en` and `/ar`

### Review Findings

- [x] [Review][Patch] `authClient.signIn.social()` was called without `await`/error handling/pending state — a failed initial request (network blip, transient error) silently did nothing visible to the user [components/auth/social-buttons.tsx:19] — fixed: awaited, `{ error }` checked, surfaced via `FormMessage`
- [x] [Review][Patch] No `disabled`/pending guard on the social buttons — a double-click (or Google-then-GitHub in quick succession) could fire two concurrent `signIn.social` requests before the redirect navigates away [components/auth/social-buttons.tsx:34] — fixed: added `pendingProvider` state, both buttons disabled while a request is in flight
- [x] [Review][Patch] `account_not_linked` error's "Sign in" link always pointed to `/sign-in`, even when already on that page — a confusing no-op since the message's own copy already says "sign in with your password" [components/auth/oauth-error-message.tsx:21] — fixed: link now hidden via `usePathname()` check when already on `/sign-in`
- [ ] [Review][Defer] `errorCallbackPath` prop on `SocialButtons` duplicates the current route, derivable via `usePathname()` — only a risk if a third caller passes a mismatched literal; deferred, no live bug with the current 2 callers [components/auth/social-buttons.tsx:13]
- [ ] [Review][Defer] `<Suspense>` wrapping `OAuthErrorMessage` is duplicated verbatim at both call sites instead of the component wrapping itself — deferred, cosmetic duplication only, both current call sites are correct [app/[locale]/(marketing)/sign-in/sign-in-form.tsx:52, .../sign-up/sign-up-form.tsx:60]
- [ ] [Review][Defer] OAuth error-code-to-message mapping is an untyped magic string inline in `oauth-error-message.tsx` rather than a shared/typed helper — deferred, no second OAuth entry point exists yet to justify extracting one [components/auth/oauth-error-message.tsx:18]

## Dev Notes

- **The epics.md wording for AC #3 ("a separate account is created") does not literally happen — read this before implementing.** Verified by reading `node_modules/better-auth/dist/oauth2/link-account.mjs` (installed `better-auth@1.6.25`) directly: when an existing local user's email matches but `emailVerified` is `false`, `handleOAuthUserInfo` returns `{ error: "account not linked" }` and the callback route (`api/routes/callback.mjs`) redirects to `errorCallbackURL` with `?error=account_not_linked` — **no session is created, and no new user row is created either.** This is also structurally the only sane behavior: Story 1.1 added a case-insensitive unique index on `user.email` (`user_email_lower_idx`), so a second account with the *same* email is not even representable in the schema. Treat the epics.md phrase as describing the *security outcome* ("the attacker's pre-registered account does not silently gain the victim's OAuth identity") rather than literal account-creation — implement Task 4's error-handling UI, not a workaround that tries to force a second row into a table with a unique constraint on email.
- **This is CVE-2026-53516's exact fix, already patched in the installed version.** Better Auth's `account.accountLinking.requireLocalEmailVerified` option defaults to `true` as of `better-auth@1.6.11+` (installed: `1.6.25`) specifically to close this account-takeover path (an attacker pre-registers the victim's email unverified, then the real owner's later "verified" OAuth sign-in used to auto-link into the attacker's row). Do not touch this default. [Source: `node_modules/better-auth/dist/oauth2/link-account.mjs` lines ~20-29, read directly on the installed version; cross-referenced against GitHub Advisory `GHSA-g38m-r43w-p2q7` / CVE-2026-53516 and PR better-auth/better-auth#9578, verified via web search Aug 2026]
- **Email matching is case-insensitive-safe already.** `handleOAuthUserInfo` looks up by `userInfo.email.toLowerCase()`, and Story 1.1 already stores/normalizes local emails to lowercase — no extra normalization work needed for this story.
- **Scope boundary — still not this story's job:** Learner/Instructor/Admin role *flags* remain Story 1.3's deliverable (same boundary Story 1.1 documented). AC #4's "role... behaves identically" is satisfied structurally because social accounts and password accounts share the exact same `user` row shape — there is nothing extra to build here.
- **Module boundary (AD-1, AD-2, AD-3) still applies:** this is entirely Better Auth's own OAuth flow (Route Handler + client SDK calls) against the Accounts module's tables — do not add a hand-written Server Action or direct query for any part of this story.
  [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-1, #AD-2, #AD-3]
- **Reuse, don't rebuild, Story 1.1's auth UI kit:** `components/auth/field.tsx`, `components/auth/form-message.tsx`, `components/ui/{input,label,button}.tsx`, and the `Link`/`useRouter`/`getPathname` exports from `lib/i18n/navigation.ts` are already established conventions — follow `app/[locale]/(marketing)/sign-in/sign-in-form.tsx` and `.../sign-up/sign-up-form.tsx` as the pattern reference for structure, state handling, and styling.
  [Source: current repo state, read directly: `components/auth/form-message.tsx`, `app/[locale]/(marketing)/sign-in/sign-in-form.tsx`, `lib/i18n/navigation.ts`, `lib/i18n/en.json`]
- **Do not reuse Story 1.1's `lib/auth/locale.ts` Referer/cookie-sniffing technique here.** That existed only because Better Auth's server-side email callbacks (`sendVerificationEmail`/`sendResetPassword`) don't have direct access to the request's locale. This story's OAuth trigger is a client component, which already knows the active locale directly via `useLocale()` — use that.
- **Verified OAuth callback path:** Better Auth mounts at `/api/auth` (Story 1.0's `app/api/auth/[...all]/route.ts`); the OAuth callback endpoint is `/api/auth/callback/{providerId}`, i.e. `/api/auth/callback/google` and `/api/auth/callback/github` — these are what you register as the "Authorized redirect URI" / "Authorization callback URL" in each provider's console.
- **No dedicated test framework is pinned in the architecture** (same as Stories 1.0/1.1) — verification is the AC walkthrough (Task 6) plus `build`/`tsc`/`lint`.

### Project Structure Notes

- New/edited files, all within the existing structure — no new top-level directories:
  - `lib/auth/config.ts` (edit — optionally add `account.accountLinking.trustedProviders`; real env values already read via existing `process.env.GOOGLE_CLIENT_ID` etc.)
  - `components/auth/social-buttons.tsx`, `components/auth/icons/google.tsx` (new)
  - `app/[locale]/(marketing)/sign-in/sign-in-form.tsx`, `.../sign-up/sign-up-form.tsx` (edit — render `<SocialButtons />`, read `?error=`)
  - `lib/i18n/en.json`, `lib/i18n/ar.json` (edit — new `Auth.social` namespace)
  - `.env.example`, `README.md` (edit — document the OAuth app setup steps from Task 1, mirroring Story 1.0's "one-time setup" style)
- No conflicts expected — extends the existing `/sign-in` and `/sign-up` pages rather than adding new routes.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.2] — full story text and acceptance criteria (verbatim origin)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-1, #AD-2, #AD-3, #AD-6]
- [Source: _bmad-output/implementation-artifacts/1-1-email-password-sign-up-sign-in.md] — Dev Agent Record, Review Findings, and established auth UI/i18n conventions this story extends
- Current repo state verified directly: `lib/auth/config.ts`, `lib/modules/accounts/schema.ts`, `components/auth/form-message.tsx`, `app/[locale]/(marketing)/sign-in/sign-in-form.tsx`, `lib/i18n/navigation.ts`, `lib/i18n/en.json`
- Better Auth source verified directly on the installed version (`node_modules/better-auth@1.6.25`): `dist/oauth2/link-account.mjs` (account-linking gate, `requireLocalEmailVerified` default), `dist/api/routes/callback.mjs` (`account_not_linked` error redirect), `dist/api/routes/sign-in.mjs` (`callbackURL`/`errorCallbackURL`/`newUserCallbackURL` param names)
- Web-verified (Aug 2026): [GHSA-g38m-r43w-p2q7 / CVE-2026-53516](https://github.com/advisories/GHSA-g38m-r43w-p2q7) — the exact vulnerability class AC #3 defends against, patched in better-auth 1.6.11+; [better-auth/better-auth#9578](https://github.com/better-auth/better-auth/pull/9578) — the fix PR

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5

### Debug Log References

- `lucide-react@1.28.0` (installed version) ships no `Github` icon — the brand/logo icon set was removed from this major version, contrary to the story's Task 3 note. Added a custom inline `GithubIcon` (`components/auth/icons/github.tsx`) alongside the planned `GoogleIcon`, same approach, no new dependency.
- 2026-08-20: `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean after Tasks 2–5.
- 2026-08-20: Ahmed provisioned real Google OAuth Client + GitHub OAuth App credentials and set them in `.env.local`; also registered the production callback URIs (`https://sanabel-six.vercel.app/api/auth/callback/{google,github}`) in both provider consoles.
- 2026-08-20: Pushed to `main` to deploy to production (https://sanabel-six.vercel.app) so Ahmed can test social login end-to-end there. Vercel's project env vars needed the same four OAuth credential values — Ahmed confirmed these were set and social login worked in production.
- 2026-08-20: Ahmed reported password-reset links opening `localhost` in production. Root cause: **not a code bug** — Better Auth's `getBaseURL()` (`node_modules/better-auth/dist/utils/url.mjs`) reads `env.BETTER_AUTH_URL` first, before ever consulting the request; Vercel's Production `BETTER_AUTH_URL` was still set to `http://localhost:3000` (carried over from `.env.local` during Story 1.0 setup). This also affects OAuth callback base URL construction, so it was relevant to this story too, not just password reset. Fix: Ahmed updated Vercel's `BETTER_AUTH_URL` to `https://sanabel-six.vercel.app` and redeployed. Confirmed by Ahmed with `grep -rn "localhost"` across the repo (outside `node_modules`) turning up nothing — no hardcoded URL in our own code.

### Completion Notes List

- Tasks 2–5 implemented and passing build/typecheck/lint: `account.accountLinking.trustedProviders` added (security default `requireLocalEmailVerified` left untouched); `SocialButtons`/`GoogleIcon`/`GithubIcon` components; both `/sign-in` and `/sign-up` render social buttons and read `?error=` (Suspense-wrapped `OAuthErrorMessage`, mapping `account_not_linked` and a generic fallback); `Auth.social` i18n namespace added to `en.json`/`ar.json`; README documents the OAuth app setup steps.
- Verified in-browser (both `/en` and `/ar`): sign-in/sign-up render social buttons correctly, `?error=account_not_linked` and generic error codes render the mapped messages, button accessible names are correct with icons `aria-hidden`.
- Task 1's credential provisioning is done (Ahmed: real Google/GitHub OAuth apps, `.env.local`, and Vercel Production env vars all confirmed working). A separate, unrelated env-var bug (`BETTER_AUTH_URL` pointing at `localhost` in Vercel Production) was found and fixed during this verification pass — see Debug Log.
- Task 6's live AC #1/#2/#3 walkthroughs were performed by Ahmed directly against production (https://sanabel-six.vercel.app), since they require signing in with his real Google/GitHub accounts — the agent cannot enter account credentials on his behalf per this session's operating rules. Ahmed confirmed all three scenarios behaved as specified (new account created, merge into existing verified account, rejection of the unverified-account takeover attempt). AC #4 is structurally guaranteed by the shared `user` table shape. A DB-inspection script was used ad hoc for earlier local-dev spot checks but was not committed to the repo, and a broader query against production data was blocked by this session's own safety controls — final AC verification rests on Ahmed's direct confirmation rather than an agent-run query.
- Full regression (`npm run build`, `npx tsc --noEmit`, `npm run lint`) re-run clean immediately before marking this story `review`.

### File List

- `lib/auth/config.ts` (edit — added `account.accountLinking.trustedProviders`)
- `components/auth/social-buttons.tsx` (new)
- `components/auth/icons/google.tsx` (new)
- `components/auth/icons/github.tsx` (new — not in original story plan, see Debug Log)
- `components/auth/oauth-error-message.tsx` (new — not in original story plan; shared `?error=` mapping used by both forms)
- `app/[locale]/(marketing)/sign-in/sign-in-form.tsx` (edit — renders `SocialButtons`, reads `?error=`)
- `app/[locale]/(marketing)/sign-up/sign-up-form.tsx` (edit — same)
- `lib/i18n/en.json`, `lib/i18n/ar.json` (edit — new `Auth.social` namespace)
- `README.md` (edit — documented Google/GitHub OAuth app setup)

## Change Log

| Date | Notes |
| --- | --- |
| 2026-08-20 | Tasks 2–5 implemented (account-linking config, social buttons, OAuth error handling, i18n/a11y); build/tsc/lint clean; verified in-browser on `/en` and `/ar`. Deviation from plan: added a custom `GithubIcon` since `lucide-react@1.28.0` ships no brand icons. |
| 2026-08-20 | Ahmed provisioned real Google/GitHub OAuth credentials and set them in `.env.local`, Vercel, and provider consoles (incl. production redirect URIs). Deployed to production (`main` pushed). |
| 2026-08-20 | Found and fixed an unrelated production bug: `BETTER_AUTH_URL` was set to `localhost` in Vercel, causing password-reset/OAuth base URLs to resolve incorrectly in production. Fixed via Vercel env var update + redeploy — not a code change. |
| 2026-08-20 | Task 6 AC #1–#3 verified by Ahmed directly against production; AC #4 structurally verified. Full regression re-run clean. Story moved to `review`. |
| 2026-08-20 | Code review (8-angle diff review): 6 findings confirmed, 2 refuted. 3 correctness findings patched (unhandled `signIn.social()` errors, no pending/disabled state on social buttons, dead-end "Sign in" link in the `account_not_linked` message when already on `/sign-in`); 3 cleanup/altitude findings deferred (see Review Findings). Build/tsc/lint clean after fixes. |
| 2026-08-20 | Story marked `done`. |
