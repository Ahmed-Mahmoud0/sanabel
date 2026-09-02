---
baseline_commit: b3a1de2a54184bab0f40d6a0ab45f9f3b4835fcb
---

# Story 1.5: Profile Basics

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want a display name, and a bio if I'm an Instructor,
so that other users can identify me and Instructors can present themselves credibly.

## Acceptance Criteria

1. **Given** I am any signed-in user, **when** I view or edit my profile, **then** I can set and update my display name.
2. **Given** I hold the Instructor role, **when** I view or edit my profile, **then** I additionally have a short bio field, distinct from the display name.
3. **Given** I am a Learner without the Instructor role, **when** I view my profile, **then** no bio field is shown or editable.
4. **Given** an Instructor has set a display name and bio, **when** their profile data is read by another module (e.g. a future course detail page), **then** both fields are available for that module to render.

## Tasks / Subtasks

- [x] Task 1: Add `bio` to the data model (AC: #2, #4)
  - [x] Add a nullable `bio: text("bio")` column to the `user` table in `lib/modules/accounts/schema.ts`
  - [x] Declare `bio` in `lib/auth/config.ts`'s `user.additionalFields`: `{ type: "string", required: false }`. **Contrast with `isInstructor`/`isAdmin`:** those are `input: false` because only an Admin may set them; `bio` is a normal self-editable field, so leave `input` at its default (`true`) — a signed-in user (Instructor) sets their own bio through Better Auth's own self-service `/update-user` endpoint, no custom Server Action needed (unlike Story 1.4, which needed one because it edits *another* account's row)
  - [x] Generate and apply the migration against the live Neon DB. No `lib/auth/client.ts` change needed — the `inferAdditionalFields` plugin (Story 1.3) already infers new fields from `typeof auth` automatically
- [x] Task 2: Cross-module read accessor for profile data (AC: #4)
  - [x] Extend the **existing** `lib/modules/accounts/service.ts` (Story 1.4) with `getPublicProfile(userId: string): Promise<{ name: string; bio: string | null; isInstructor: boolean } | null>` — a read-only function other modules (Course Authoring, Discovery — Epics 2/3) will call to render an Instructor's name/bio, per AD-3's cross-module access rule. No consumer exists yet; this story only needs to expose the accessor, matching the AC's literal wording ("available for that module to render"). Add it to this file, don't start a second Accounts service file
- [x] Task 3: Profile page — display name, any signed-in user (AC: #1)
  - [x] New `app/[locale]/(learner)/profile/page.tsx`. The `(learner)` route group's existing guard (Story 1.3) is "any signed-in account" — not "acting as a Learner" — which is exactly the right fit: profile editing isn't Learner-specific, every account type (including Instructors and the Admin) needs it, and this is where "signed-in, no role required" already lives
  - [x] Server Component reads `getSessionUser()` for the initial `name`/`bio`/`isInstructor` values; a client form component submits via `authClient.updateUser({ name, ...(isInstructor && { bio }) })` — this is the user editing their **own** row, exactly what Better Auth's built-in self-service endpoint is for
  - [x] After a successful update, call `router.refresh()` (same pattern as `sign-in-form.tsx`) so any Server-Component-rendered surface reflects the change immediately
- [x] Task 4: Bio field — Instructor-only, shown and editable (AC: #2, #3)
  - [x] Add `components/ui/textarea.tsx` via `npx shadcn@latest add textarea` (not yet in the project — only `button`/`input`/`label`/`badge` exist so far)
  - [x] Render the bio field only when the session user's `isInstructor` is `true`. For a Learner, the field must be **absent from the rendered DOM**, not disabled or hidden via CSS — the same bar Story 1.3 set for role-gated nav items (AC #3's "no bio field is shown or editable")
  - [x] Apply a reasonable soft length limit (e.g. ~280 characters) client- and server-side. Nothing in the epics/architecture specifies a number — this is a judgment call to keep a free-text field from being unbounded; document the choice in code
  - [x] **Known, accepted gap — state it, don't silently skip it or over-build a fix:** `bio`'s `additionalFields` entry has no server-side check preventing a Learner from calling `authClient.updateUser({ bio })` directly, bypassing the UI. This is a data-model inconsistency, not a security issue (it's still a self-only write with no privilege change). Hiding the field in the UI satisfies AC #3's literal wording for the actual product surface. Do not add a `databaseHooks.user.update` gate for this — it's out of proportion to the risk, consistent with this project's existing pattern of writing down and accepting comparably low-stakes gaps (e.g. Story 1.0's Neon-teardown gap, Story 1.2's silent-email-failure gap) rather than building unrequested enforcement
- [x] Task 5: Nav link to Profile (AC: #1) — closes a real end-to-end gap, not explicitly asked for but necessary
  - [x] `components/nav/site-header.tsx` (Story 1.3) currently has no link to any profile/settings page at all — add one, visible to any signed-in user (same `{user && (...)}` guard already used for "My Learning"). Without it, this story's own page is reachable only by typing the URL — the same category of gap Story 1.4 flagged and explicitly left open for `/accounts`; this story is the natural place to close it for `/profile` specifically (leave `/accounts` out of scope here)
- [x] Task 6: i18n + accessibility (AC: all)
  - [x] New `Profile` namespace in `lib/i18n/en.json`/`lib/i18n/ar.json`: page title, display-name label, bio label (**visibly distinct from the display-name label**, per AC #2), character-count text, save/success/error strings, plus the new `Nav.profile` link label — no hardcoded strings
  - [x] Bio textarea has its own accessible label and a visible character counter; both fields have correct `lang`/logical layout in `/ar`
- [x] Task 7: End-to-end verification (AC: all)
  - [x] Any signed-in user: update the display name, confirm it persists and the page (and nav, after `router.refresh()`) reflects the new value
  - [x] Learner (no Instructor): confirm no bio field or edit control is rendered anywhere on the profile page
  - [x] Instructor: confirm the bio field appears, can be set and updated, and persists across a reload
  - [x] Exercise `getPublicProfile()` directly (same throwaway-script precedent as Stories 1.3/1.4, since no consuming module exists yet) and confirm it returns the updated name/bio for an Instructor account
  - [x] `npm run build`, `npx tsc --noEmit`, `npm run lint` clean; spot-check both `/en` and `/ar`

### Review Findings

_Code review 2026-09-02 — adversarial layers: Blind Hunter, Edge Case Hunter, Acceptance Auditor. Outcome: 1 decision-needed, 4 patch, 2 deferred, 12 dismissed as noise. The Acceptance Auditor confirmed all 4 ACs, all 7 tasks, and every Dev Notes directive (a)–(g) are satisfied, and that the server-side `bio` length cap is genuinely wired through Better Auth's `parseInputData`._

**Decision resolved** (Ahmed, 2026-09-02 — chose to close the gap despite the story's original "accept it" guidance)

- [x] [Review][Patch] `bio` server-side role gate — added `databaseHooks.user.update.before` in `lib/auth/config.ts`: rejects with `403 FORBIDDEN` ("Only instructors can set a profile bio.") when the update payload carries a `bio` key and `ctx.context.session.user.isInstructor !== true`. Only `/update-user` (self-service) routes `bio` through this hook; Story 1.4's admin grant is a direct Drizzle write that skips it, and email-verification updates carry no `bio`. Supersedes Task 4 bullet 4. Verified: Learner `POST {bio}` and `POST {bio:null}` → 403; Learner `POST {name}` → 200; Instructor `POST {bio}` → 200. [lib/auth/config.ts]

**Patch**

- [x] [Review][Patch] `handleSubmit` now early-returns `if (pending)`, and the display-name `Field` + bio `Textarea` are `disabled={pending}` — no duplicate `updateUser` on an Enter press mid-save [app/[locale]/(learner)/profile/profile-form.tsx]
- [x] [Review][Patch] Profile page redirects a signed-out user (`return redirect({ href: "/sign-in", locale })`) instead of returning bare `null` — defense-in-depth matching the admin pages; verified signed-out `/en/profile` → `/en/sign-in` [app/[locale]/(learner)/profile/page.tsx]
- [x] [Review][Patch] `bio` is trimmed before send and sent as `null` (not `""`) when empty; the server `validator.input` now passes `null`/`undefined` through. Verified: UI save trims trailing whitespace (DB stores 21-char value), and `POST {bio:null}` clears the column to SQL `NULL` [app/[locale]/(learner)/profile/profile-form.tsx, lib/auth/config.ts]
- [x] [Review][Patch] `bioTooLong` now also requires `nextBio !== initialBio.trim()`, so an already-stored over-limit bio can't lock the user out of a display-name-only save [app/[locale]/(learner)/profile/profile-form.tsx]

**Deferred** (also logged in `deferred-work.md`)

- [x] [Review][Defer] `name` has no server-side validation (empty-after-trim / length) — a raw `update-user` request can set a whitespace-only or oversized display name that then renders app-wide [app/[locale]/(learner)/profile/profile-form.tsx] — deferred, pre-existing (shared with sign-up; no cheap in-scope fix without a `databaseHooks.user.update` hook the story deliberately avoided)
- [x] [Review][Defer] No automated tests for the `bio` `validate` fn, `getPublicProfile`, or the form's non-Instructor / over-limit paths [lib/auth/config.ts, lib/modules/accounts/service.ts] — deferred, pre-existing (no test framework in the project through Stories 1.0–1.4; verification is build/tsc/lint + AC walkthrough)

## Dev Notes

- **This is self-service editing, unlike Story 1.4 — reuse Better Auth's own `/update-user`, don't build a Server Action.** Story 1.4 needed a custom Server Action + direct Drizzle write because an Admin edits *someone else's* row and the fields involved are `input: false`. Here, a user edits their *own* `name`/`bio`, which is precisely what Better Auth's built-in self-service update endpoint is designed for (verified in Story 1.4 against `node_modules/better-auth/dist/api/routes/update-user.mjs`: it targets `session.user.id` — exactly what we want this time, not a limitation to work around). Building a parallel Server Action for this would duplicate Better Auth's own mutation path for no reason.
- **AD-4's autosave contract does not apply here.** AD-4 is explicitly scoped to "Course Authoring (outline editor, lesson editors) — FR-12," not profile settings. Use an explicit submit/save button, matching the established auth-form pattern (`sign-in-form.tsx`, `sign-up-form.tsx`) — not a debounced autosave pattern borrowed from a different part of the architecture.
- **`(learner)` is a guard level, not a literal role restriction.** Story 1.3 built that route group's guard as "any signed-in account," not "must be acting as a Learner" — Instructors and the Admin are also, structurally, signed-in accounts, and nothing in the FRs restricts them from Learner-tier surfaces. Placing `/profile` there is correct even though Instructors will use it too.
- **Module boundary (AD-2, AD-3):** extend the *existing* `lib/modules/accounts/service.ts` (Story 1.4) rather than creating a second Accounts service file — Accounts owns `User`, and this story's new read accessor belongs next to `setInstructorRole`/`listAccounts`, not in a new module or in `app/`.
  [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-2, #AD-3]
- **The Consistency Conventions' discriminated-union return shape is for mutations crossing the client boundary (Server Actions/Route Handlers), not every exported function.** `getPublicProfile()` is a plain intra-server read another module's service layer will call — it returns the value or `null` directly, the same shape as the existing `listAccounts`/`setInstructorRole` in that file. Don't wrap it in `{ok,...}` — that convention governs the boundary Story 1.4's `setInstructorRoleAction` sits on, not this.
- **`additionalFields` + Drizzle schema still move together** (Story 1.3's finding, still true): the new `bio` column in `lib/modules/accounts/schema.ts` and the `user.additionalFields.bio` declaration in `lib/auth/config.ts` are both required, or `session.user.bio` stays `undefined` even though the DB column exists.
- **Reuse established conventions:** `components/ui/{input,label,button}.tsx`, `components/auth/field.tsx`/`form-message.tsx`, DESIGN.md tokens, `lib/i18n/navigation.ts`'s `Link`/`useRouter`, and the `getSessionUser`/`hasRole` exports from `lib/auth/authorization.ts` (Story 1.3) for the page-level read.
- **No dedicated test framework is pinned in the architecture** (same as Stories 1.0–1.4) — verification is the AC walkthrough (Task 7) plus `build`/`tsc`/`lint`.

### Project Structure Notes

- New/edited files, all within the existing structure — no new top-level directories:
  - `lib/modules/accounts/schema.ts` (edit — `bio` column) + a new `drizzle/000X_*.sql` migration
  - `lib/auth/config.ts` (edit — `user.additionalFields.bio`)
  - `lib/modules/accounts/service.ts` (edit — add `getPublicProfile`)
  - `app/[locale]/(learner)/profile/page.tsx` (new) + a client form component (e.g. `app/[locale]/(learner)/profile/profile-form.tsx`)
  - `components/ui/textarea.tsx` (new, via `npx shadcn add textarea`)
  - `components/nav/site-header.tsx` (edit — add the Profile link)
  - `lib/i18n/en.json`, `lib/i18n/ar.json` (edit — new `Profile` namespace + `Nav.profile`)
- No conflicts expected — extends the `(learner)` route group Story 1.3 already scaffolded and guarded, and the `Accounts` module's existing `service.ts`/`schema.ts` from Stories 1.3/1.4.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.5] — full story text and acceptance criteria (verbatim origin)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-2, #AD-3, #AD-4, #Consistency-Conventions]
- [Source: _bmad-output/implementation-artifacts/1-4-admin-grants-and-revokes-instructor-role.md] — established `lib/modules/accounts/service.ts` this story extends, the self-vs-other-account update distinction, and the precedent of flagging (not silently fixing or over-building) a low-stakes nav-link gap
- Current repo state verified directly: `lib/modules/accounts/schema.ts`, `lib/modules/accounts/service.ts`, `lib/auth/config.ts` (`additionalFields`/`databaseHooks` shape), `components/nav/site-header.tsx` (confirmed: no name display, no profile link exists yet), `components/ui/` (no `textarea.tsx` yet), `lib/i18n/en.json`

## Dev Agent Record

### Agent Model Used

claude-sonnet-5 (BMAD dev-story workflow)

### Debug Log References

- `npm run db:generate` → `drizzle/0004_past_gravity.sql` (`ALTER TABLE "user" ADD COLUMN "bio" text;`). `npm run db:migrate` → applied to the live Neon DB successfully.
- `npx shadcn@latest add textarea --yes` → created `components/ui/textarea.tsx` (plain `<textarea>` + `cn`, matches `input.tsx` styling). Registry resolved `shadcn@4.19.1`.
- `npx tsc --noEmit` → clean; `npx eslint .` → clean; `npx next build` → success. `/[locale]/profile` compiles as `ƒ` (dynamic — reads the session via `getSessionUser()`); no new static routes.
- Throwaway live-DB script (`npx tsx --env-file=.env.local`, real `@/lib/modules/accounts/service` against Neon, 17 assertions): `bio` column is `text` + nullable; `getPublicProfile` returns the right `{name,bio,isInstructor}` shape for an Instructor (name + bio), a Learner (bio `null`), and `null` for an unknown id; name update and bio set/clear round-trip. **ALL PASS.** Script + `story15-*` fixtures deleted afterwards; 0 `story15-*` rows remain.
- Browser walkthrough (dev server, fresh email/password account created through the sign-up UI → real session):
  - Learner `/en/profile`: display-name field present, **no `#bio` element in the DOM** (`read_page` accessibility tree + `document.getElementById('bio')` both confirm absence) — AC #3.
  - Updated display name (`Story15 E2E` → `Story15 Renamed`): "Saving…" pending state, then green "Your profile has been updated." success message; value persists across a full page reload; DB row confirms `name = "Story15 Renamed"` — AC #1.
  - Promoted the same row to `is_instructor = true` (direct SQL, mimicking Story 1.4's admin grant), reloaded `/profile`: the **"Instructor bio"** field now appears (label visibly distinct from "Display name"), with a live "0 / 280 characters" counter; nav also gained "My Courses" (fresh per-request session read). Typed a 65-char bio → counter → "65 / 280"; saved; persists across reload — AC #2.
  - Server-side length cap: `fetch("/api/auth/update-user", { body: { bio: "x".repeat(281) } })` (bypassing the UI) → `400 VALIDATION_ERROR` "bio must be at most 280 characters"; exactly 280 → `200 {status:true}`. Confirms the `validator.input` Standard Schema on the `bio` additionalField.
  - `/ar/profile`: RTL layout correct — Arabic heading/labels right-aligned, distinct bio label ("نبذة المدرّب" vs "الاسم المعروض"), character counter at the logical end.
  - Console: only the one deliberate `400` from the over-limit bypass test; no other errors.
  - Test account (`story15-e2e-1@example.test`) deleted; session/account rows cascaded; 0 `story15-*` rows remain.

### Completion Notes List

**What shipped**

- **`lib/modules/accounts/schema.ts`** — added `bio: text("bio")` (nullable) to the `user` table. No DB-level length constraint (kept `text` per Task 1); the soft cap is enforced in application code.
- **`lib/modules/accounts/profile.ts`** (new) — `BIO_MAX_LENGTH = 280`, a deliberately import-free module so both the server auth config and the client form share one number. 280 is a documented judgment call (nothing in epics/architecture pins a value).
- **`lib/auth/config.ts`** — added `bio` to `user.additionalFields` as `{ type: "string", required: false }` with `input` left at its default (`true`) — contrast with `isInstructor`/`isAdmin` which are `input: false`. Server-side length cap is a hand-rolled Standard Schema object on `validator.input` (no validation library pulled in for one bound); Better Auth runs it on every `/update-user` carrying a `bio`, so UI-bypassing requests over the limit are rejected `400`.
- **`lib/modules/accounts/service.ts`** — added `getPublicProfile(userId): Promise<{ name; bio: string | null; isInstructor } | null>`, a plain intra-server read returning the value/`null` directly (not the `{ok,...}` union — that convention is for client-boundary mutations, per Dev Notes). Sits next to `setInstructorRole`/`listAccounts` in the existing Accounts service; no new module or file.
- **`app/[locale]/(learner)/profile/page.tsx`** (new) — Server Component in the existing `(learner)` group (guard = "signed in", not "acting as Learner"). Reads `getSessionUser()` for the authoritative initial `name`/`bio`/`isInstructor`, renders the `Profile` heading/subtitle and the client form.
- **`app/[locale]/(learner)/profile/profile-form.tsx`** (new, `"use client"`) — display-name `Field` + Instructor-only bio `Textarea` with visible character counter (`aria-describedby`). Submits via `authClient.updateUser({ name, ...(isInstructor ? { bio } : {}) })` — self-service, no Server Action. On success: sets the trimmed name back into state, shows a success `FormMessage`, and calls `router.refresh()` so the nav / any RSC surface re-reads. Client guards: empty display name and (for Instructors) `bio.length > BIO_MAX_LENGTH` block submit with a localized message; the textarea also has `maxLength`.
- **`components/ui/textarea.tsx`** (new, via shadcn) — DESIGN.md `{components.input}` names `Textarea` as an expected primitive.
- **`components/nav/site-header.tsx`** — added a `/profile` link for any signed-in user (`{user && (...)}`, same guard as "My Learning"), closing the "reachable only by URL" gap for `/profile` (Story 1.4 flagged the same gap and left `/accounts` open — still out of scope here).
- **`lib/i18n/en.json` + `lib/i18n/ar.json`** — new `Profile` namespace (title, subtitle, display-name label/placeholder/required-error, bio label/placeholder/`bioCharCount`/`bioTooLongError`, save/saving/success/genericError) + `Nav.profile`. Bio label is deliberately worded distinct from the display-name label in both locales ("Instructor bio" / "نبذة المدرّب"). No hardcoded UI strings.

**AC #3 accepted gap (Task 4, bullet 4):** the `bio` additionalField still has no *role* check — a Learner could `POST /update-user { bio }` directly. This stays a self-only write with no privilege change; hiding the field in the UI satisfies AC #3's wording for the product surface. Per the task's explicit instruction, no `databaseHooks.user.update` gate was added. (The `validator.input` added for the *length* cap is a separate concern and does not gate on role.)

**Not exercised in a browser:** the full cross-module render of `getPublicProfile()` output — no consumer module exists yet (Epics 2/3). The accessor itself is covered by the 17-assertion live-DB script. This matches the Stories 1.3/1.4 precedent (no test framework; verification is the AC walkthrough + `build`/`tsc`/`lint`).

### File List

- `lib/modules/accounts/schema.ts` (edit — `bio: text("bio")` nullable column)
- `lib/modules/accounts/profile.ts` (new — `BIO_MAX_LENGTH` shared constant, import-free)
- `lib/auth/config.ts` (edit — `bio` in `user.additionalFields` with `validator.input` length cap)
- `lib/modules/accounts/service.ts` (edit — `getPublicProfile()`)
- `app/[locale]/(learner)/profile/page.tsx` (new — profile page Server Component)
- `app/[locale]/(learner)/profile/profile-form.tsx` (new — `"use client"` form: display name + Instructor-only bio)
- `components/ui/textarea.tsx` (new — via `npx shadcn add textarea`)
- `components/nav/site-header.tsx` (edit — `/profile` nav link for signed-in users)
- `lib/i18n/en.json` (edit — `Profile` namespace + `Nav.profile`)
- `lib/i18n/ar.json` (edit — `Profile` namespace + `Nav.profile`)
- `drizzle/0004_past_gravity.sql` (new — `ADD COLUMN "bio" text`)
- `drizzle/meta/0004_snapshot.json` + `drizzle/meta/_journal.json` (drizzle-kit generated)
- `lib/auth/config.ts` (code-review edit — `databaseHooks.user.update.before` bio role gate + `APIError` import; `validator.input` now tolerates `null`)

## Change Log

| Date       | Change                                                                 |
|------------|-----------------------------------------------------------------------|
| 2026-08-31 | Implemented Story 1.5: `user.bio` nullable column (migration `0004`) + `bio` self-service `additionalField` with a Standard Schema `validator.input` length cap (`BIO_MAX_LENGTH = 280`, shared via new import-free `lib/modules/accounts/profile.ts`); `getPublicProfile()` cross-module read accessor in the Accounts service; `/[locale]/(learner)/profile` page + `"use client"` form (display name for any signed-in user, Instructor-only bio textarea with visible character counter, `authClient.updateUser` self-service + `router.refresh()`); `components/ui/textarea.tsx`; `/profile` nav link for signed-in users; `Profile` i18n namespace + `Nav.profile` (en + ar, distinct bio label). `tsc` + `lint` + `build` clean; 17-assertion live-DB verification of `getPublicProfile` + the `bio` column; browser walkthrough of AC #1–#3 on `/en` and `/ar` (Learner sees no bio field in the DOM; display-name and bio edits persist across reload; UI-bypassing over-limit bio → `400`). Status → review. |
| 2026-09-02 | Code-review fixes (5 patches applied): (1) **`bio` server-side role gate** — `databaseHooks.user.update.before` in `config.ts` rejects `403` when a non-Instructor's `/update-user` payload carries `bio` (per Ahmed's review decision, overriding Task 4's "accept the gap"); (2) `handleSubmit` `if (pending) return` + inputs `disabled={pending}` — no double-submit; (3) profile page `redirect(...)` for signed-out instead of bare `null`; (4) bio trimmed + sent as `null` when empty, server `validator.input` tolerates `null`; (5) `bioTooLong` guard also requires the bio to have changed. `tsc` + `lint` + `build` clean; browser re-verify (fresh account): Learner `POST {bio}`/`{bio:null}` → 403, `POST {name}` → 200; Instructor 281-char → 400, 280 → 200, `{bio:null}` clears column to `NULL`; UI trims trailing whitespace; signed-out `/profile` → `/sign-in`. Status → done. |
