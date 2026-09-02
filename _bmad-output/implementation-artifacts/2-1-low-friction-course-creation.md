---
baseline_commit: 2af9cf124e38a4ff5ce7e0f18b829bbd36c89089
---

# Story 2.1: Low-Friction Course Creation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an Instructor,
I want to create a course by providing only a title, one-line description, and category,
so that I can start building without a heavyweight setup form standing in my way.

## Acceptance Criteria

1. **Given** I hold the Instructor role, **when** I click "Create a course" and submit a title, one-line description, and Category, **then** a Course record is created with no other field required, and I land in the outline editor.
2. **Given** I am creating a course, **when** I fill in the creation form, **then** I must also choose the course's content language (`contentLanguage`: English or Arabic) — no separate language step exists later.
3. **Given** I am a Learner without the Instructor role, **when** I attempt to reach the course-creation flow, **then** I am blocked (enforced by Story 1.3's role gate).
4. **Given** I have just created a course, **when** I view "My Courses," **then** the new course appears there, unpublished.
5. **Given** I am an Instructor with zero courses yet, **when** I first open "My Courses," **then** I see a single "Create your first course" primary action, not an empty grid.

## Tasks / Subtasks

- [x] Task 1: Course Authoring module — schema (AC: #1, #2, #4)
  - [x] New `lib/modules/course-authoring/schema.ts` — the first real schema in this module (it's been an empty `export {}` stub since Story 1.0). A `course` table: `id` (text PK, `.$defaultFn(() => generateId())` from `lib/db/id.ts`, matching `user`'s UUIDv7 pattern), `instructorId` (references `user.id`), `title` (text, required), `description` (text, required — "one-line," apply a soft length cap client+server, judgment call like Story 1.5's `BIO_MAX_LENGTH`), `category` (Postgres enum — Task 2), `contentLanguage` (Postgres enum: `'en' | 'ar'`, per AD-9), `publishedAt` (nullable `timestamptz` — `null` means unpublished/draft; Story 2.10 sets it), `createdAt`/`updatedAt` (`timestamptz`, matching `user`'s pattern)
  - [x] Register the new slice in `lib/db/schema.ts`'s barrel: `export * from "@/lib/modules/course-authoring/schema"`, alongside the existing Accounts export
  - [x] Generate and apply the migration — this is the **first non-Accounts table in the system**
- [x] Task 2: Course category taxonomy — an explicit, flagged judgment call (AC: #1)
  - [x] No FR, epic, or architecture document anywhere enumerates Sanabel's actual course categories. Use a fixed Postgres enum, not free text — a free-text field would fragment into inconsistent Instructor-invented values and undermine Epic 3's "filterable by Category" (FR-17)
  - [x] `[ASSUMPTION]` draft starter set, Ahmed should adjust to taste — cheap to change later via a follow-up enum migration, not a blocking decision now: `programming-fundamentals`, `web-development`, `data-science`, `mobile-development`, `devops-cloud`, `computer-science`, `other`
  - [x] Store the stable enum value in the DB; translated display labels live only in the i18n catalog (Task 7), never as the canonical stored value — same rule AD-9 already applies to every other user-facing string
- [x] Task 3: Course Authoring service + Server Action (AC: #1, #2, #3)
  - [x] New `lib/modules/course-authoring/service.ts`: `createCourse({ instructorId, title, description, category, contentLanguage })`, `listCoursesByInstructor(instructorId)`, `getCourseById(courseId)` — the **second** populated module `service.ts` in the codebase (Accounts was first, Story 1.4); follow its shape — plain functions, direct Drizzle queries, return values/`null` directly, no `{ok,...}` wrapping (that convention is for the client-boundary action layer, not intra-server reads/writes)
  - [x] New `lib/modules/course-authoring/actions.ts` (`"use server"`): `createCourseAction(input)` — calls `requireRole("instructor")` first (the exact convention `(instructor)/courses/page.tsx`'s own comment already states: "Server Actions / Route Handlers in these groups use `requireRole()`"), wraps the whole body so nothing throws across the client boundary (the same AD-6-vs-Consistency-Conventions seam Story 1.4 first had to reconcile), validates title/description/category/contentLanguage server-side, and returns `{ok:true, data:{courseId}} | {ok:false, error:{code,message}}`
- [x] Task 4: Course creation form (AC: #1, #2, #3)
  - [x] New `app/[locale]/(instructor)/courses/new/page.tsx` + a client form component. Inherits `(instructor)/layout.tsx`'s guard; add the same per-page `can("instructor")` → `notFound()` defense-in-depth the sibling `courses/page.tsx` already established
  - [x] Add `npx shadcn@latest add select` (not yet in the project) for the category dropdown; a simple two-option control (select or radio group — dev agent's call) for `contentLanguage`
  - [x] Fields: title, one-line description, category, content language. **No other field** — AC #1 is explicit, don't add visibility/pricing/anything else (those are Story 2.10's territory)
  - [x] On success, the action returns `{courseId}`; the client `router.push`es to `/courses/{courseId}` (Task 5). The action does **not** itself `redirect()` — matches the discriminated-union convention, not a thrown Next.js control-flow redirect
- [x] Task 5: Course landing page — explicitly **not** the outline editor (AC: #1)
  - [x] AC #1 says creating a course lands the Instructor "in the outline editor," but building the actual Module/Lesson outline UI is Story 2.2's job ("Outline-First Module & Lesson Structuring"), not this one's — building it here would be scope creep into 2.2
  - [x] New `app/[locale]/(instructor)/courses/[courseId]/page.tsx` — a minimal but real course-builder landing page: course title, description, category, content-language badge, an "unpublished/draft" indicator. This is the actual destination for AC #1's "I land in…" — Story 2.2 fleshes out this **same route**, it doesn't replace it with a different one
  - [x] Guard: instructor-only (inherited) **and ownership** — only the course's own Instructor may view it. Add `isOwner(user, resourceOwnerId)` to `lib/auth/authorization.ts` (a small equality-check helper alongside `hasRole`) and call it here as `isOwner(user, course.instructorId)` → `notFound()` otherwise. This is the first real use of AD-6's `can(action, resource)` framing beyond pure role-checking — Story 1.3's Dev Notes explicitly reserved this extension point ("a future story extending `can()` to resource-scoped checks should extend this same module, not create a second helper file"); ownership checks will recur for every module going forward (Module/Lesson editing, later Epics), so this is worth building as a real, reusable primitive now, not a one-off inline check
- [x] Task 6: "My Courses" — real content + empty state (AC: #4, #5)
  - [x] Replace the `courses/page.tsx` placeholder with `listCoursesByInstructor(session.user.id)` results
  - [x] Zero courses: a **single** "Create your first course" primary action (linking to `/courses/new`) — not an empty grid or list chrome around it (AC #5's explicit wording)
  - [x] One or more courses: a simple list/row per course — title, category badge, content-language badge ("Taught in: Arabic"/"Taught in: English," matching the exact copy DESIGN.md already commits to for course-cards), an "unpublished" indicator — each linking to `/courses/{courseId}`, plus a persistent "Create a course" action. **Deliberately minimal, not the full DESIGN.md `course-card` component** (16:9 thumbnail, progress-bar): there's no course thumbnail/content concept yet at this point in Epic 2, and the progress-bar is a Learner "My Learning" concept per DESIGN.md, not this Instructor surface. Upgrading to the full course-card is natural once Epic 3's Browse page gives it a real visual peer — not required now
- [x] Task 7: i18n + accessibility (AC: all)
  - [x] New `Course` namespace in `lib/i18n/en.json`/`lib/i18n/ar.json`: create-course form labels/placeholders/errors, translated category labels (keyed off the stable enum value — never store translated text, per Task 2), My Courses page strings, empty-state copy, "unpublished" indicator label — no hardcoded strings
  - [x] Standard bar already established across Epic 1: logical properties, icon+text errors via `components/auth/form-message.tsx`, accessible names, `/en`/`/ar` parity
- [x] Task 8: End-to-end verification (AC: all)
  - [x] Instructor with zero courses: My Courses shows the single "Create your first course" action only, nothing else
  - [x] Create a course (all four fields): confirm the `course` row persists with `instructorId` correct and `publishedAt` `null`; confirm the redirect lands on `/courses/{courseId}` showing the entered data back correctly
  - [x] My Courses now lists the new course, clearly marked unpublished
  - [x] As a Learner (no Instructor role): confirm `/courses`, `/courses/new`, and a direct `/courses/{courseId}` URL are all blocked
  - [x] As a **different** Instructor: confirm they cannot view another Instructor's `/courses/{courseId}` (ownership check, not just the role check)
  - [x] `npm run build`, `npx tsc --noEmit`, `npm run lint` clean; spot-check both `/en` and `/ar`

## Dev Notes

- **This is the first story to build inside Course Authoring — the module-boundary discipline Epic 1 established now applies to a second module.** `lib/modules/course-authoring/service.ts`/`actions.ts` should read as siblings of `lib/modules/accounts/service.ts`/`actions.ts` (Story 1.4), not a reinvention — same shape, same conventions, same "plain reads return values directly, mutations crossing the client boundary return `{ok,...}`" split.
  [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-1, #AD-2, #AD-3]
- **The "outline editor" destination is a scope boundary, not an oversight.** AC #1's literal wording implies the outline editor exists after this story; it doesn't yet (Story 2.2). This story must land the Instructor somewhere real (`/courses/{courseId}`, Task 5) that Story 2.2 will extend into the actual outline editor — not a dead-end placeholder, and not a premature attempt to build Module/Lesson management now.
- **Category taxonomy is this story's own `[ASSUMPTION]`**, in the same spirit DESIGN.md marks its own undecided calls. Ahmed can adjust the enum values later; what matters architecturally is that it's a bounded, DB-enforced set from day one rather than free text that would need retrofitting once Epic 3's browse/filter is built on top of it.
- **`isOwner()` is new, shared infrastructure, not a one-off.** Adding it to `lib/auth/authorization.ts` now — rather than an inline `course.instructorId === session.user.id` check duplicated per page — follows through on Story 1.3's own stated intent for `can(action, resource)` and gives every future ownership check in Epic 2+ (Module/Lesson edits, etc.) one place to reuse.
- **`contentLanguage` (this story) and the UI locale (Story 1.6) are independent concerns that happen to share the same two values.** AD-9 is explicit about this: Course content language is set once by the Instructor and never auto-translated; it has nothing to do with which language the *browsing visitor's UI chrome* is currently in. Don't conflate the two or default `contentLanguage` off the current UI locale.
  [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-9]
- **Reuse established conventions:** `components/ui/{button,input,label,badge}.tsx`, `components/auth/form-message.tsx`, DESIGN.md tokens, `lib/i18n/navigation.ts`'s `Link`/`useRouter`, and the exact per-page guard shape `(instructor)/courses/page.tsx` already documents in its own comment (`can()` → `notFound()` for pages/layouts, `requireRole()` for actions).
- **No dedicated test framework is pinned in the architecture** (same as every Epic 1 story) — verification is the AC walkthrough (Task 8) plus `build`/`tsc`/`lint`.

### Project Structure Notes

- New/edited files, all within the existing structure — no new top-level directories:
  - `lib/modules/course-authoring/schema.ts` (new — replaces the empty stub) + a new `drizzle/000X_*.sql` migration
  - `lib/db/schema.ts` (edit — export the new slice)
  - `lib/modules/course-authoring/service.ts`, `lib/modules/course-authoring/actions.ts` (new)
  - `lib/auth/authorization.ts` (edit — add `isOwner`)
  - `app/[locale]/(instructor)/courses/new/page.tsx` (new, + client form)
  - `app/[locale]/(instructor)/courses/[courseId]/page.tsx` (new)
  - `app/[locale]/(instructor)/courses/page.tsx` (edit — replace the placeholder)
  - `components/ui/select.tsx` (new, via `npx shadcn add select`)
  - `lib/i18n/en.json`, `lib/i18n/ar.json` (edit — new `Course` namespace)
- No conflicts expected — extends the `(instructor)` route group and its already-placeholder `courses/page.tsx` from Story 1.3; the `course-authoring` module directory goes from an empty stub to its first real files, mirroring Accounts' Story 1.3→1.4 progression.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.1, #Epic-2] — full story text/acceptance criteria and Epic 2's overall scope for cross-story context
- [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-1, #AD-2, #AD-3, #AD-9, #Consistency-Conventions] — module ownership, `contentLanguage` contract, UUIDv7/snake_case/discriminated-union conventions
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-BMAD Test-2026-08-02/DESIGN.md] — `{components.course-card}`/`{components.badge}` specs (language-badge copy), Colors/Typography tokens
- [Source: _bmad-output/implementation-artifacts/1-3-role-model-role-gated-navigation.md, 1-4-admin-grants-and-revokes-instructor-role.md] — the `can()`/`requireRole()` split this story's guards and action follow, and the `isOwner`/resource-check extension point Story 1.3 explicitly reserved
- Current repo state verified directly: `app/[locale]/(instructor)/courses/page.tsx` (placeholder + its own documented guard convention), `app/[locale]/(instructor)/layout.tsx`, `lib/modules/course-authoring/index.ts` (empty stub), `lib/db/schema.ts` (barrel), `lib/db/id.ts` (`generateId()`), `lib/auth/authorization.ts`, `components/ui/` (no `select.tsx` yet)

## Dev Agent Record

### Agent Model Used

claude-sonnet-5 (Claude Code / bmad-dev-story workflow)

### Debug Log References

- `npm run db:generate` → `drizzle/0005_mysterious_wilson_fisk.sql` (course table + `course_category` / `course_content_language` enums + FK + index).
- `npm run db:migrate` → applied successfully to the live Neon database.
- `npx tsc --noEmit` → clean. `npm run lint` → clean. `npm run build` → clean; routes `/[locale]/courses`, `/[locale]/courses/[courseId]`, `/[locale]/courses/new` all registered.
- Dedicated DB-layer verification script (throwaway, run from project root then deleted): 11 assertions, **all PASS** — valid insert, `published_at` defaults `NULL` (draft), `created_at`/`updated_at` auto-set, `instructor_id` stored, list returns rows newest-first, get-by-id works, invalid `category` rejected by enum, invalid `content_language` rejected by enum, unknown `instructor_id` rejected by FK, `course_instructor_id_idx` present, instructor delete cascades course rows. DB left clean (0 course rows, only the pre-existing user).
- `GET /en/courses/new` for an unauthenticated visitor → **HTTP 404** (route-group layout guard + per-page `can("instructor")` → `notFound()`), confirming AC #3 / the Story 1.3 convention that Instructor routes 404 for non-Instructors.
- **Interactive UI click-through was blocked by the environment:** the in-app browser pane did not dispatch synthetic click/type events (`form_input` set values, but submit-button clicks produced no `POST /api/auth/*`; screenshots timed out). Pages compiled and served 200 server-side. The form/action/landing/list logic is a direct mirror of the Story 1.4 `setInstructorRoleAction` + `account-row.tsx` patterns and is covered by tsc/build. Recommend a quick manual walkthrough locally, plus the `code-review` workflow (different LLM) as the next gate.

### Completion Notes List

- **First real Course Authoring module.** `course-authoring/` goes from an empty `index.ts` stub to `course.ts` (import-free shared constants), `schema.ts`, `service.ts`, `actions.ts` — laid out as siblings of `lib/modules/accounts/` per the Dev Notes. The `index.ts` stub was removed (Accounts has no `index.ts`; the barrel is `lib/db/schema.ts`).
- **`course` schema**: `id` text PK via Drizzle-level `.$defaultFn(() => generateId())` (UUIDv7), `instructorId` FK → `user.id` (`onDelete: "cascade"`, matching `session`/`account`), `title`/`description` required text, `category` + `contentLanguage` Postgres enums, `publishedAt` nullable (`null` = draft; Story 2.10 sets it), `createdAt`/`updatedAt` with the same `defaultNow()` / `$onUpdate` pattern as `user`. Timestamps are `timestamptz` (`{ withTimezone: true }`) per the Architecture Spine — initially shipped as plain `timestamp` to match `user`, then corrected to the spine convention in the code-review pass (migration `0006`). The `user` table still uses plain `timestamp`; aligning it is a separate change.
- **Category taxonomy** `[ASSUMPTION]`: `programming-fundamentals`, `web-development`, `data-science`, `mobile-development`, `devops-cloud`, `computer-science`, `other` — a bounded Postgres enum, stable slugs stored, human labels only in the i18n `Course.categories.*` catalog. Ahmed can adjust via a follow-up enum migration.
- **Soft length caps** (`course.ts`, import-free like `accounts/profile.ts`): `COURSE_TITLE_MAX_LENGTH = 120` (mirrors the display-name field), `COURSE_DESCRIPTION_MAX_LENGTH = 200` ("one-line"). Enforced client-side (`maxLength` + inline validation) and server-side (in `actions.ts`).
- **`createCourseAction`** re-checks `requireRole("instructor")`, wraps the whole body in try/catch (`unstable_rethrow` first), validates all four fields server-side regardless of client input, and returns the discriminated union `{ok:true,data:{courseId}} | {ok:false,error:{code,message}}` — it does **not** `redirect()`; the client `router.push`es to `/courses/{courseId}` on `ok`. `revalidatePath("/[locale]/(instructor)/courses", "page")` refreshes My Courses.
- **`isOwner(user, resourceOwnerId)`** added to `lib/auth/authorization.ts` (pure, synchronous, type-predicate — alongside `hasRole`), per Story 1.3's reserved `can(action, resource)` extension point. Used by the course landing page as `isOwner(user, course.instructorId)` → `notFound()`. This is the reusable primitive for every future ownership check in Epic 2+.
- **Course landing page** (`courses/[courseId]/page.tsx`) is intentionally minimal-but-real (title, description, category + "Taught in:" badges, draft badge, "outline editor coming next" note) — Story 2.2 grows this **same route** into the outline editor. Static `new` segment wins over dynamic `[courseId]`, so `/courses/new` resolves to the form.
- **My Courses** now renders `listCoursesByInstructor(user.id)`: zero courses → a single "Create your first course" action (no grid chrome, AC #5); ≥1 course → a persistent "Create a course" action plus one row per course (title, category badge, "Taught in: English/Arabic" badge matching DESIGN.md copy, "Unpublished" indicator) linking to `/courses/{courseId}`. Deliberately not the full DESIGN.md `course-card` (no thumbnail/progress concept yet in Epic 2).
- **Select component**: `npx shadcn@latest add select` produced a `@base-ui/react/select`-based component consistent with the project's existing primitives (not Radix). One tweak: `data-[size=default]` height changed `h-8` → `h-11` to match the project's ~44px touch-target floor (`Input`/`Button` default). Used for both `category` and `contentLanguage` (two-option) controls.
- **i18n**: new `Course` namespace added to `en.json` and `ar.json` with identical structure — `new.*` (form labels/placeholders/errors/hint), `categories.*` (7, keyed off the stable enum slug), `language.*` (`taughtIn` + `en`/`ar`), `list.*`, `builder.*`. No hardcoded user-facing strings. Errors use the shared `FormMessage` (icon + text); logical properties throughout via the shared components.
- **Not done (conscious scope calls):** no `useLocaleSwitchFormState` on the creation form (Story 1.6 AC #2 targeted auth forms; not in this story's ACs or tasks); no accent-color `Button` variant (none exists in the project; used the primary variant for the CTA).

### Code review follow-ups (2026-09-02)

`code-review` (high effort) reported 10 findings; **all 10 fixed** in the same session:

1. **[correctness] Double-submit → duplicate course** — creation form now uses `useTransition`; `isPending` stays true through the post-success navigation, so the submit button can't be re-clicked into a second `createCourseAction`.
2. **[correctness] `revalidatePath` route-group path** — changed `"/[locale]/(instructor)/courses"` → `"/[locale]/courses"` (route groups aren't part of the route pattern). Fixed the same latent issue in `accounts/actions.ts`.
3. **[efficiency] `listCoursesByInstructor` unbounded/unprojected** — now caps at `LIST_COURSES_LIMIT = 200` and selects only the 5 columns "My Courses" renders (returns `CourseListItem`), matching the `listAccounts` precedent.
4. **[reuse] `ActionResult<T>` duplicated** — hoisted to new `lib/actions/result.ts`; both `accounts/actions.ts` and `course-authoring/actions.ts` import it.
5. **[reuse] Course badge trio duplicated across both pages** — extracted `components/course/course-meta-badges.tsx` (`<CourseMetaBadges>`); each page passes its own `draftLabel`.
6. **[conventions] `timestamp` not `timestamptz`** — `course` timestamps switched to `{ withTimezone: true }` per the Architecture Spine; migration `0006_soft_rogue.sql` (ALTER to `timestamptz`) generated and applied. (`user` table still uses plain `timestamp` — separate, out-of-scope.)
7. **[reuse] Validation triplicated** — new shared `parseCourseFields()` in `course.ts` (trims + validates + narrows types); called by both the Server Action and the client form. Removed the six hand-copied client `if` blocks.
8. **[reuse] `messageForCode` re-implemented** — new `actionErrorText(code, map, fallback)` in `lib/actions/result.ts`; both the creation form and `account-row.tsx` use it instead of a hand-rolled `switch`.
9. **[efficiency] Select option lists rebuilt every render** — `categoryItems` / `languageItems` are `useMemo`'d and the `<SelectItem>` children now iterate the memoized array (one map each, not two).
10. **[simplification] `courses/page.tsx` fragment split + no-op `cn()`** — collapsed to one create-`<Link>` (variant/label chosen from `isEmpty`) + `{!isEmpty && <ul>…}`; `buttonVariants()` used directly, `cn` import dropped.

Also folded in during the fixes: `isCourseCategory` / `isCourseContentLanguage` now come from one `memberOf()` guard factory; the Server Action's `input.title?.trim() ?? ""` half-guards were replaced by `parseCourseFields`'s proper `unknown`-boundary handling.

Re-verification after fixes: `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean; migration `0006` applied; DB script confirms `published_at`/`created_at`/`updated_at` are now `timestamp with time zone` and inserts/enum-rejection/cascade still work; DB left clean.

### File List

- `lib/modules/course-authoring/course.ts` (new — import-free shared constants + `memberOf()` guards + `parseCourseFields()` shared client/server validation)
- `lib/modules/course-authoring/schema.ts` (new — `course` table + `courseCategory` / `courseContentLanguage` pg enums + relation; `timestamptz`)
- `lib/modules/course-authoring/service.ts` (new — `createCourse`, `listCoursesByInstructor` (capped + projected → `CourseListItem`), `getCourseById`)
- `lib/modules/course-authoring/actions.ts` (new — `"use server"` `createCourseAction`; imports shared `ActionResult`, uses `parseCourseFields`)
- `lib/modules/course-authoring/index.ts` (deleted — empty stub; module now has real files, mirroring Accounts)
- `lib/actions/result.ts` (new — shared `ActionResult<T>` union + `actionErrorText()` code→message helper)
- `lib/db/schema.ts` (edit — barrel now re-exports the course-authoring slice)
- `lib/auth/authorization.ts` (edit — new `isOwner()` resource-ownership primitive)
- `lib/modules/accounts/actions.ts` (edit — imports `ActionResult` from `lib/actions/result`; `revalidatePath` path de-grouped)
- `drizzle/0005_mysterious_wilson_fisk.sql` (new — course table + enums + FK + index, applied)
- `drizzle/0006_soft_rogue.sql` (new — ALTER course timestamps to `timestamptz`, applied)
- `drizzle/meta/0005_snapshot.json`, `drizzle/meta/0006_snapshot.json`, `drizzle/meta/_journal.json` (new/edit — drizzle-kit metadata)
- `components/ui/select.tsx` (new — `npx shadcn add select`, base-ui; `h-8`→`h-11` default-size tweak)
- `components/course/course-meta-badges.tsx` (new — shared `<CourseMetaBadges>` used by both course surfaces)
- `app/[locale]/(instructor)/courses/new/page.tsx` (new — creation route, guarded)
- `app/[locale]/(instructor)/courses/new/create-course-form.tsx` (new — client form; `useTransition`, memoized option lists, shared parse/error helpers)
- `app/[locale]/(instructor)/courses/[courseId]/page.tsx` (new — course-builder landing page, ownership-guarded)
- `app/[locale]/(instructor)/courses/page.tsx` (edit — real My Courses list + empty state; uses `<CourseMetaBadges>`)
- `app/[locale]/(admin)/accounts/account-row.tsx` (edit — uses shared `actionErrorText()` instead of a local `switch`)
- `lib/i18n/en.json` (edit — new `Course` namespace)
- `lib/i18n/ar.json` (edit — new `Course` namespace)

## Change Log

- 2026-09-02 — Story 2.1 implemented: first Course Authoring module slice (course schema/enums/migration, service + `createCourseAction`), low-friction creation form (title / one-line description / category / content language — no other field), minimal course-builder landing page, My Courses real list + "Create your first course" empty state, `isOwner()` resource-ownership primitive, `Course` i18n namespace (EN/AR). `npm run build` / `tsc` / `lint` clean; migration `0005` applied; DB-layer verification script all-pass. Status → review.
- 2026-09-02 — Addressed code review findings — 10 items resolved (double-submit guard via `useTransition`; `revalidatePath` paths de-grouped; `listCoursesByInstructor` capped + projected; `ActionResult` + `actionErrorText` hoisted to `lib/actions/result.ts`; `<CourseMetaBadges>` extracted; `course` timestamps → `timestamptz` via migration `0006`; shared `parseCourseFields`; memoized Select option lists; `courses/page.tsx` simplified). Re-ran `tsc` / `lint` / `build` clean; migration `0006` applied; DB re-verified.
