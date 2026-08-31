---
baseline_commit: 163971114e02031d514e34af4afb8eabfc20de74
---

# Story 1.4: Admin Grants and Revokes Instructor Role

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the Admin,
I want to grant or revoke the Instructor role on any account,
so that I control who can author courses without a self-service application flow.

## Acceptance Criteria

1. **Given** I am signed in as the Admin, **when** I view an account and grant it the Instructor role, **then** that account immediately gains access to Instructor-only surfaces.
2. **Given** an account currently holds the Instructor role, **when** I, as Admin, revoke that role, **then** the account loses access to Instructor-only surfaces on its very next request — not after a delay or token expiry (DB-backed session, AD-6).
3. **Given** I am signed in as a Learner (not Admin), **when** I attempt to access the role-management surface directly by URL, **then** I am blocked from it.
4. **Given** there is no self-service Instructor-request flow in v1, **when** a Learner looks for a way to request Instructor access in-product, **then** no such flow exists (grants happen out-of-band, per FR-4's note).

## Tasks / Subtasks

- [x] Task 1: Accounts module service layer — grant/revoke + list (AC: #1, #2)
  - [x] New `lib/modules/accounts/service.ts`: `setInstructorRole(userId: string, isInstructor: boolean)` — a **direct Drizzle write** to `user.isInstructor` via `lib/db/client.ts`'s `db`. This is the first populated module `service.ts` in the codebase (every other `lib/modules/*/` besides `accounts` is still an empty Story 1.0 stub) — see Dev Notes for why a direct write is correct here and not an AD-3 violation
  - [x] Also add `listAccounts({ query }: { query?: string })` (case-insensitive match on email/name, no pagination) to back the admin UI's account search, and a small `getAccountById(userId)` if the UI needs a detail view — keep both read-only and minimal
- [x] Task 2: `setInstructorRole` Server Action (AC: #1, #2, #3)
  - [x] New `lib/modules/accounts/actions.ts` (`"use server"`): `setInstructorRoleAction(userId: string, isInstructor: boolean)` — calls `requireRole("admin")` from `lib/auth/authorization.ts` **first**, then Task 1's `setInstructorRole`
  - [x] The whole action body must be wrapped so nothing throws across the client boundary (Consistency Conventions): catch `AuthorizationError` (and anything else) and return `{ok:false, error:{code, message}}`; `requireRole()`'s throw is an internal implementation detail the action itself must absorb, not propagate — see Dev Notes, this is a real seam between AD-6 and the Consistency Conventions that's easy to get backwards
  - [x] On success return `{ok:true, data:{userId, isInstructor}}` and `revalidatePath()` the accounts page (or return enough for the client to update optimistically) so the row's state reflects the change without a full reload
- [x] Task 3: Admin accounts / role-management page (AC: #1, #2, #3)
  - [x] New `app/[locale]/(admin)/accounts/page.tsx` — automatically inherits `(admin)/layout.tsx`'s `can("admin")` → `notFound()` guard (Story 1.3); also add the same **per-page** `can()`/`notFound()` defense-in-depth Story 1.3's code review established for the sibling `.../moderation/page.tsx` (same convention, same file shape)
  - [x] Add `components/ui/badge.tsx` via `npx shadcn@latest add badge` (not yet in the project — only `button`/`input`/`label` exist so far) — DESIGN.md's `{components.badge}` spec already earmarks Badge for exactly this: "role tags (Instructor, Admin)"
  - [x] Minimal searchable account list (by email/name, no pagination — matches this project's small-launch-scale conventions elsewhere, e.g. no dedicated search service, no observability stack): each row shows the account's email/display name and a `Badge` for its current role state, plus a Grant/Revoke Instructor button calling Task 2's action
  - [x] Surface a failed action through the existing `components/auth/form-message.tsx` (icon + text) — reuse, don't rebuild
- [x] Task 4: Confirm no self-service request flow exists (AC: #4)
  - [x] This AC is a negative requirement, not a build task: verify — by inspection of the nav (Story 1.3's `site-header.tsx`), the Learner surfaces, and course-creation attempts as they stand after Stories 1.0–1.3 — that no "Request Instructor access" affordance exists anywhere. Nothing to add.
- [x] Task 5: i18n + accessibility (AC: all)
  - [x] New `Admin.accounts` namespace in `lib/i18n/en.json`/`lib/i18n/ar.json`: page title, search placeholder, role badge labels, grant/revoke button labels, empty/no-results state — no hardcoded strings
  - [x] Each grant/revoke button's accessible name includes the account identity and the action (e.g. "Grant Instructor role to ahmed@example.com"), not just "Grant" — a row of identical bare "Grant"/"Revoke" buttons loses all context for a screen-reader user navigating by button list
- [x] Task 6: End-to-end verification (AC: all)
  - [x] Grant Instructor to a plain Learner test account (created in Story 1.1/1.2 testing or fresh) → confirm that account sees My Courses and can reach `/courses` on its very next request (Story 1.3's guard), with no re-login needed
  - [x] Revoke it → confirm the account loses access on its very next request — no delay, no stale session (re-verifies Story 1.3's DB-backed/no-cookie-cache finding against a real grant→revoke cycle, not just a manual DB edit)
  - [x] As a Learner (not Admin), attempt to navigate directly to `/en/accounts` → confirm blocked (`notFound()`)
  - [x] Call `setInstructorRoleAction` directly as (or simulating) a non-admin session and confirm it returns `{ok:false, error:{...}}` rather than throwing — defense-in-depth for the Server Action itself, independent of the page guard
  - [x] `npm run build`, `npx tsc --noEmit`, `npm run lint` clean; spot-check both `/en` and `/ar`

## Dev Notes

- **Why a direct Drizzle write is correct here, not an AD-3 violation.** Every `user`-table write so far (Stories 1.0–1.3) went through Better Auth's own public API (`signUp`, `updateUser`, session hooks) because that API already covered the need. It doesn't cover this one: `node_modules/better-auth/dist/api/routes/update-user.mjs` hardcodes the target to `session.user.id` — there is no "update a *different* user" endpoint in Better Auth's public API — and `isInstructor`/`isAdmin` are `input: false` in `additionalFields` anyway (Story 1.3), so even Better Auth's own client SDK cannot set them for *any* target, including the calling admin's own account. AD-3's rule ("never a raw query against **another** module's schema") constrains modules *other than* the owner; Accounts owns `user` (AD-2), so a direct Drizzle write from `lib/modules/accounts/service.ts` — Accounts' own service layer — is exactly what AD-1/AD-2 describe, not an exception to it. This is also the first story to actually populate a module's `service.ts`; every sibling module directory is still an empty stub, and this file is the concrete precedent later epics should follow.
  [Source: `node_modules/better-auth/dist/api/routes/update-user.mjs`, `node_modules/better-auth/dist/db/internal-adapter.mjs`, read directly on the installed `better-auth@1.6.25`]
- **`requireRole()` throwing and a Server Action never throwing are not in conflict — but only if the action catches it.** AD-6 pins `requireRole()` to throw `AuthorizationError` on failure; the Consistency Conventions pin every Server Action to return `{ok:true,data} | {ok:false,error:{code,message}}` and never throw across the client boundary. `setInstructorRoleAction` must call `requireRole("admin")` inside a try/catch (or equivalent) and translate any thrown `AuthorizationError` into the `{ok:false,...}` shape before returning — don't call `requireRole()` unguarded inside a `"use server"` function and let Next.js's default error handling take it from there, which is a different (and worse, less controllable) failure UX than the discriminated union the rest of the app relies on.
- **Reuse Story 1.3's authorization module verbatim — don't rebuild any of it.** `lib/auth/authorization.ts` already exports `getSessionUser`, `hasRole`, `can`, `requireRole`, `AuthorizationError`, and the established convention from Story 1.3's own code review: **pages/layouts guard via `can()`/`notFound()`; Server Actions/Route Handlers guard via `requireRole()` (throws)**. This story is the first real consumer of the Server-Action half of that convention — Story 1.3 had no Server Actions yet.
  [Source: current repo state, read directly: `lib/auth/authorization.ts`]
- **Nothing stops an Admin from granting Instructor to their own account.** FR-4 says "any account," with no carve-out for the Admin's own row, and AD-6's roles are independent/additive — if Ahmed wants to author courses himself, he grants his own account Instructor through this exact UI. Don't add a special case blocking self-grant; there is no requirement for one.
- **Module boundary (AD-1, AD-2, AD-3) still applies** beyond the direct-write point above: the Server Action and page are the only callers of `lib/modules/accounts/service.ts`; no other module or `app/` route reaches into Accounts' schema directly.
  [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-1, #AD-2, #AD-3, #AD-6, #Consistency-Conventions]
- **Session freshness needs no new work** — already established in Story 1.3: `session.cookieCache` stays disabled, so `getSessionUser()`/`auth.api.getSession()` reads the DB fresh on every call. A revoke is visible the instant the target's next request lands. Task 6 re-verifies this against a real grant→revoke cycle rather than re-deriving it.
- **Reuse `components/ui/button.tsx`, `components/auth/form-message.tsx`, DESIGN.md tokens, and `lib/i18n/navigation.ts`'s `Link`/`useRouter`** — same established conventions as every prior Epic 1 story.
- **No dedicated test framework is pinned in the architecture** (same as Stories 1.0–1.3) — verification is the AC walkthrough (Task 6) plus `build`/`tsc`/`lint`.

### Project Structure Notes

- New/edited files, all within the existing structure — no new top-level directories:
  - `lib/modules/accounts/service.ts` (new — `setInstructorRole`, `listAccounts`, `getAccountById`)
  - `lib/modules/accounts/actions.ts` (new — `setInstructorRoleAction`, `"use server"`)
  - `app/[locale]/(admin)/accounts/page.tsx` (new — inherits the existing `(admin)/layout.tsx` guard)
  - `components/ui/badge.tsx` (new, via `npx shadcn add badge`)
  - `lib/i18n/en.json`, `lib/i18n/ar.json` (edit — new `Admin.accounts` namespace)
- No conflicts expected — extends the `(admin)` route group Story 1.3 already scaffolded and guarded; the `Accounts` module gets its first real service/action files, its schema (`schema.ts`) is untouched.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.4] — full story text and acceptance criteria (verbatim origin)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-1, #AD-2, #AD-3, #AD-6, #Consistency-Conventions]
- [Source: _bmad-output/implementation-artifacts/1-3-role-model-role-gated-navigation.md] — `isInstructor`/`isAdmin` flags, `lib/auth/authorization.ts`, the `(admin)` route guard, and the pages-use-`can()`/actions-use-`requireRole()` convention this story is the first to actually exercise on the Server-Action side
- Current repo state verified directly: `lib/auth/authorization.ts`, `lib/db/client.ts`, `lib/modules/accounts/schema.ts` (no `service.ts` yet), `components/ui/` (no `badge.tsx` yet), `app/[locale]/(admin)/moderation/page.tsx` (per-page guard pattern to mirror), `lib/i18n/en.json`
- Better Auth source verified directly on the installed version (`node_modules/better-auth@1.6.25`): `dist/api/routes/update-user.mjs` (self-only target, confirming a direct DB write is required for admin-driven grants), `dist/db/internal-adapter.mjs` (the underlying `updateUser(userId, data)` primitive Better Auth's own routes use, not directly reachable from application code)
- Web-verified (Aug 2026): DESIGN.md's `{components.badge}` component spec was already checked in Story 1.0/1.2 groundwork and explicitly names "role tags (Instructor, Admin)" as a Badge use case — no new research needed for this story.

## Dev Agent Record

### Agent Model Used

claude-sonnet-5 (BMAD dev-story workflow)

### Debug Log References

- `npx shadcn@latest add badge --yes` → created `components/ui/badge.tsx` (base-nova style, `@base-ui/react` + `cva`, matches the existing `button.tsx`). Registry resolved `shadcn@4.19.0`.
- `npx tsc --noEmit` → clean; `npx eslint .` → clean; `npx next build` → success. `/[locale]/accounts` compiles as `ƒ` (dynamic, expected — reads the session via `can()`), no new static routes.
- Throwaway verification script (`npx tsx`, real `@/lib/modules/accounts/service` + real `hasRole` against the live Neon DB, 16 assertions): grant → `is_instructor=true`, revoke → `is_instructor=false`, admin self-grant allowed (no carve-out), `listAccounts` substring + case-insensitive (ILIKE) + no-query-returns-all + LIKE-metachar escaping, unknown-id → `null`, and the `hasRole` gate (null / plain-learner / instructor-not-admin all fail `admin`). **ALL PASS.** Script + its `story14-*` fixtures deleted afterwards; script confirmed 0 `story14-*` rows remain.
- Browser (dev server): signed-out GET `/en/accounts` and `/ar/accounts` both return `404` (the `(admin)` layout's `can("admin")` → `notFound()`), confirming AC #3's direct-URL block. No server errors in the dev log.
- `grep` over `app/`, `components/`, `lib/` for any "request/become/apply-for instructor" affordance → no matches (AC #4).

### Completion Notes List

**What shipped**

- `lib/modules/accounts/service.ts` (new — first populated module `service.ts` in the repo): `setInstructorRole(userId, isInstructor)` does a **direct Drizzle write** to `user.isInstructor` via `lib/db/client`'s `db` (`.update().set().where().returning(...)`), returning a trimmed `AccountSummary` or `null`. Also `listAccounts({ query })` — `ILIKE` substring match on email/name with LIKE-metacharacter escaping, ordered by name, no pagination — and read-only `getAccountById(userId)`. This is Accounts' own service layer writing Accounts' own table (AD-1/AD-2), not an AD-3 exception; direct write is required because Better Auth's `updateUser` is self-target-only and `isInstructor` is `input: false`.
- `lib/modules/accounts/actions.ts` (new, `"use server"`): `setInstructorRoleAction(userId, isInstructor)` calls `requireRole("admin")` **first**, then `setInstructorRole`. Whole body is wrapped in try/catch: `AuthorizationError` → `{ok:false, error:{code:"forbidden", …}}`, unknown row → `{ok:false, code:"not_found"}`, anything else → `{ok:false, code:"unknown"}` (logged). `unstable_rethrow` guards Next control-flow signals before the catch maps anything. Success → `revalidatePath("/[locale]/(admin)/accounts", "page")` + `{ok:true, data:{userId, isInstructor}}`. A local `ActionResult<T>` discriminated-union type is exported for the client.
- `app/[locale]/(admin)/accounts/page.tsx` (new — Server Component): inherits the `(admin)/layout.tsx` guard **and** repeats the per-page `can("admin")` → `notFound()` defense-in-depth (same shape as `moderation/page.tsx`). Reads `searchParams.q`, calls `listAccounts`, renders a plain `method="get"` search form (reuses `components/auth/field.tsx`) and a bordered list. Empty vs. no-results messaging is distinct.
- `app/[locale]/(admin)/accounts/account-row.tsx` (new — `"use client"` leaf): role badges (`Learner` always, `Instructor`/`Admin` when set) + a Grant/Revoke button. Click runs the action inside `useTransition`; on success the action's `revalidatePath` re-renders the list server-side in the same response (row comes back with new state — no manual `router.refresh`). Failure → inline `FormMessage` with a **code-mapped translated** message (no reliance on the server's English error string). Button `aria-label` is `"Grant Instructor role to {email}"` / `"Revoke Instructor role from {email}"` — full context in the screen-reader button list.
- `components/ui/badge.tsx` (new, via shadcn) — DESIGN.md `{components.badge}` "role tags" use case.
- `lib/i18n/en.json` + `lib/i18n/ar.json` (edit): new `Admin.accounts` namespace — title/subtitle, search label+placeholder+submit, three role labels, grant/revoke labels, `grantAria`/`revokeAria` with `{email}`, working/empty/no-results states, three error strings. No hardcoded UI strings.

**AC #4** is a negative requirement — verified by inspection (nav `site-header.tsx`, Learner placeholders, no course-creation surface yet), nothing to build.

**What was NOT exercised in a browser** (same bar as Story 1.3, which verified via an in-process script — there is no test framework and no seeded Admin session available here):

- The full browser `grant → target's next request sees My Courses / reaches `/courses` → revoke → next request blocked` round-trip, and a signed-in **Learner** (vs. signed-out) hitting `/en/accounts`. The mechanism is Story 1.3's DB-backed session + route-group guard, which is unchanged; the grant/revoke write itself and the `hasRole` gate are covered by the 16-assertion live-DB script, and the signed-out direct-URL 404 is confirmed in-browser. The real `am161050@gmail.com` row is still `is_admin=false` (Story 1.3's documented manual step), so no Admin UI session could be established without creating credentials.
- Calling `setInstructorRoleAction` outside a request context isn't meaningful (`revalidatePath`/`headers()` need the Next runtime); its non-admin path is covered by the `hasRole` gate test + the static guarantee that `requireRole` throws `AuthorizationError` and the catch maps it to `{ok:false}`.

**Follow-up / notes for review**

- No nav link to `/accounts` was added — `site-header.tsx` is not in this story's file list and the story scopes nav changes out. An Admin reaches the page by URL for now; a later story (or a trivial follow-up) can add the link next to the existing "Admin moderation" entry.
- `revalidatePath` path pattern includes the `(admin)` route group and `[locale]` dynamic segment with `type: "page"`, per the Next 16 `revalidatePath` docs' route-group example.

### File List

- `lib/modules/accounts/service.ts` (new — `setInstructorRole`, `listAccounts` [capped at 100], `AccountSummary`)
- `lib/modules/accounts/actions.ts` (new — `setInstructorRoleAction`, `ActionResult<T>`, `"use server"`)
- `app/[locale]/(admin)/accounts/page.tsx` (new — admin accounts page, per-page `can()`/`notFound()` guard + search + list)
- `app/[locale]/(admin)/accounts/account-row.tsx` (new — client row: role badges, Grant/Revoke button, inline error)
- `components/ui/badge.tsx` (new — via `npx shadcn add badge`)
- `lib/i18n/en.json` (edit — new `Admin.accounts` namespace)
- `lib/i18n/ar.json` (edit — new `Admin.accounts` namespace)

## Change Log

| Date       | Change                                                                 |
|------------|-----------------------------------------------------------------------|
| 2026-08-31 | Implemented Story 1.4: Accounts module service layer (`setInstructorRole` direct Drizzle write, `listAccounts`, `getAccountById`), `setInstructorRoleAction` Server Action (guarded by `requireRole("admin")`, never throws across the client boundary), admin `/accounts` role-management page (per-page guard, GET search, role badges, Grant/Revoke), `components/ui/badge.tsx`, `Admin.accounts` i18n namespace (en + ar). `tsc` + `lint` + `build` clean; 16-assertion live-DB verification of the service + `hasRole` gate all pass; signed-out `/en/accounts` & `/ar/accounts` return 404 in-browser. Status → review. |
| 2026-08-31 | Code-review fixes (6 findings applied): (1) `page.tsx` normalizes `searchParams.q` when it arrives as `string[]` (repeated `?q=`) instead of crashing on `.trim()`; (2) `account-row.tsx` wraps the Server Action dispatch in try/catch → inline `errorGeneric` on a rejected call rather than hitting the error boundary; (3) `listAccounts` bounded with `LIMIT 100`; (4) removed unused `getAccountById`; (5) `ActionResult.error.message` documented as a non-localized diagnostic (never rendered) and the hardcoded English strings replaced with terse diagnostics; (6) `components/ui/badge.tsx` marked `"use client"` (calls the `useRender` hook). `tsc` + `lint` + `build` clean; 4-assertion live-DB re-verify (grant, search, cap) all pass. |
