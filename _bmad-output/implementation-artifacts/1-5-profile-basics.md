# Story 1.5: Profile Basics

Status: ready-for-dev

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

- [ ] Task 1: Add `bio` to the data model (AC: #2, #4)
  - [ ] Add a nullable `bio: text("bio")` column to the `user` table in `lib/modules/accounts/schema.ts`
  - [ ] Declare `bio` in `lib/auth/config.ts`'s `user.additionalFields`: `{ type: "string", required: false }`. **Contrast with `isInstructor`/`isAdmin`:** those are `input: false` because only an Admin may set them; `bio` is a normal self-editable field, so leave `input` at its default (`true`) — a signed-in user (Instructor) sets their own bio through Better Auth's own self-service `/update-user` endpoint, no custom Server Action needed (unlike Story 1.4, which needed one because it edits *another* account's row)
  - [ ] Generate and apply the migration against the live Neon DB. No `lib/auth/client.ts` change needed — the `inferAdditionalFields` plugin (Story 1.3) already infers new fields from `typeof auth` automatically
- [ ] Task 2: Cross-module read accessor for profile data (AC: #4)
  - [ ] Extend the **existing** `lib/modules/accounts/service.ts` (Story 1.4) with `getPublicProfile(userId: string): Promise<{ name: string; bio: string | null; isInstructor: boolean } | null>` — a read-only function other modules (Course Authoring, Discovery — Epics 2/3) will call to render an Instructor's name/bio, per AD-3's cross-module access rule. No consumer exists yet; this story only needs to expose the accessor, matching the AC's literal wording ("available for that module to render"). Add it to this file, don't start a second Accounts service file
- [ ] Task 3: Profile page — display name, any signed-in user (AC: #1)
  - [ ] New `app/[locale]/(learner)/profile/page.tsx`. The `(learner)` route group's existing guard (Story 1.3) is "any signed-in account" — not "acting as a Learner" — which is exactly the right fit: profile editing isn't Learner-specific, every account type (including Instructors and the Admin) needs it, and this is where "signed-in, no role required" already lives
  - [ ] Server Component reads `getSessionUser()` for the initial `name`/`bio`/`isInstructor` values; a client form component submits via `authClient.updateUser({ name, ...(isInstructor && { bio }) })` — this is the user editing their **own** row, exactly what Better Auth's built-in self-service endpoint is for
  - [ ] After a successful update, call `router.refresh()` (same pattern as `sign-in-form.tsx`) so any Server-Component-rendered surface reflects the change immediately
- [ ] Task 4: Bio field — Instructor-only, shown and editable (AC: #2, #3)
  - [ ] Add `components/ui/textarea.tsx` via `npx shadcn@latest add textarea` (not yet in the project — only `button`/`input`/`label`/`badge` exist so far)
  - [ ] Render the bio field only when the session user's `isInstructor` is `true`. For a Learner, the field must be **absent from the rendered DOM**, not disabled or hidden via CSS — the same bar Story 1.3 set for role-gated nav items (AC #3's "no bio field is shown or editable")
  - [ ] Apply a reasonable soft length limit (e.g. ~280 characters) client- and server-side. Nothing in the epics/architecture specifies a number — this is a judgment call to keep a free-text field from being unbounded; document the choice in code
  - [ ] **Known, accepted gap — state it, don't silently skip it or over-build a fix:** `bio`'s `additionalFields` entry has no server-side check preventing a Learner from calling `authClient.updateUser({ bio })` directly, bypassing the UI. This is a data-model inconsistency, not a security issue (it's still a self-only write with no privilege change). Hiding the field in the UI satisfies AC #3's literal wording for the actual product surface. Do not add a `databaseHooks.user.update` gate for this — it's out of proportion to the risk, consistent with this project's existing pattern of writing down and accepting comparably low-stakes gaps (e.g. Story 1.0's Neon-teardown gap, Story 1.2's silent-email-failure gap) rather than building unrequested enforcement
- [ ] Task 5: Nav link to Profile (AC: #1) — closes a real end-to-end gap, not explicitly asked for but necessary
  - [ ] `components/nav/site-header.tsx` (Story 1.3) currently has no link to any profile/settings page at all — add one, visible to any signed-in user (same `{user && (...)}` guard already used for "My Learning"). Without it, this story's own page is reachable only by typing the URL — the same category of gap Story 1.4 flagged and explicitly left open for `/accounts`; this story is the natural place to close it for `/profile` specifically (leave `/accounts` out of scope here)
- [ ] Task 6: i18n + accessibility (AC: all)
  - [ ] New `Profile` namespace in `lib/i18n/en.json`/`lib/i18n/ar.json`: page title, display-name label, bio label (**visibly distinct from the display-name label**, per AC #2), character-count text, save/success/error strings, plus the new `Nav.profile` link label — no hardcoded strings
  - [ ] Bio textarea has its own accessible label and a visible character counter; both fields have correct `lang`/logical layout in `/ar`
- [ ] Task 7: End-to-end verification (AC: all)
  - [ ] Any signed-in user: update the display name, confirm it persists and the page (and nav, after `router.refresh()`) reflects the new value
  - [ ] Learner (no Instructor): confirm no bio field or edit control is rendered anywhere on the profile page
  - [ ] Instructor: confirm the bio field appears, can be set and updated, and persists across a reload
  - [ ] Exercise `getPublicProfile()` directly (same throwaway-script precedent as Stories 1.3/1.4, since no consuming module exists yet) and confirm it returns the updated name/bio for an Instructor account
  - [ ] `npm run build`, `npx tsc --noEmit`, `npm run lint` clean; spot-check both `/en` and `/ar`

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
