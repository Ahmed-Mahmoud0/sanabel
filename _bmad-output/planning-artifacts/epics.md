---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - prds/prd-BMAD Test-2026-07-30/prd.md
  - architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md
  - architecture/architecture-BMAD Test-2026-08-02/SOLUTION-DESIGN.md
  - ux-designs/ux-BMAD Test-2026-08-02/DESIGN.md
  - ux-designs/ux-BMAD Test-2026-08-02/EXPERIENCE.md
---

# Sanabel - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Sanabel, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

**4.1 Accounts & Authentication**
- FR-1: Email/password authentication — any visitor can sign up and sign in using email and password, with email verification, password reset, and duplicate-signup rejection.
- FR-2: Social login (Google, GitHub) — a social account and an email/password account on the same, verified email are treated as one user.
- FR-3: Role model — every account is a Learner by default; Instructor role only via Admin grant; Learner never sees Instructor-only surfaces.
- FR-4: Admin grants/revokes the Instructor role on any account; no self-service request flow in v1.
- FR-5: Profile basics — every user has a display name; Instructors additionally have a short bio shown on their Courses.

**4.2 Course Authoring**
- FR-6: Low-friction course creation — an Instructor creates a Course with only title, one-line description, and Category.
- FR-7: Outline-first structuring — an Instructor adds Modules and Lessons as a nested outline, naming a Lesson before authoring its content.
- FR-8: Drag-reorder — Modules and Lessons are reorderable via drag-and-drop directly in the outline view.
- FR-9: Multi-format lesson authoring — a Lesson has exactly one Lesson Type: Video (upload), Text (rich text + syntax-highlighted code), PDF (upload), Quiz (auto-graded multiple choice), or Interactive Code Exercise (auto pass/fail).
- FR-10: Upload/processing status — Video and PDF uploads show queued/processing/ready/failed status at all times, with retry on failure.
- FR-11: Upload limits — Video/PDF uploads are capped per Lesson and per Instructor to bound Cloudflare Stream cost; an over-cap upload is rejected at upload time.
- FR-12: Autosave — all course-builder edits (outline, content, ordering) autosave continuously with no explicit save step.
- FR-13: Learner-accurate preview — an Instructor can preview a Course exactly as a Learner would, including mobile rendering, before publishing.
- FR-14: Publish with visibility and category — a Course publishes as Public or Unlisted with a required Category; no pricing option ever appears.
- FR-15: Post-publish content changes — an Instructor can add Modules/Lessons to a published Course without disrupting enrolled Learners; already-issued Certificates are not revoked.
- FR-16: Instructor analytics — an Instructor sees per-Lesson view count and completion count for their own published Course.

**4.3 Course Discovery**
- FR-17: Browse and search — any visitor can browse/search Public Courses by Category/topic; search matches title, description, Category; Unlisted Courses never appear.
- FR-18: Course detail page — any visitor can view a Course's title, Instructor name/bio, preview, full Module/Lesson outline (titles only), and aggregate Rating/Reviews without signing in; Lesson content itself requires Enrollment.
- FR-19: Enrollment — a signed-in Learner can enroll in any reachable Public or Unlisted Course at no cost, with no separate payment/approval step.

**4.4 Learning Experience**
- FR-20: Progress display — an enrolled Learner sees an overall Course progress bar and per-Lesson completion checkmarks in the outline.
- FR-21: Resume where left off — a "Continue" control takes the Learner directly to their last incomplete Lesson, from any device/session.
- FR-22: Video playback controls — Video Lessons support playback speed control and resume-from-last-position.
- FR-23: Interactive exercise grading — Interactive Code Exercises auto-grade a submission and return immediate pass/fail feedback with an explanatory hint on failure.
- FR-24: Quiz grading — Quizzes auto-grade multiple-choice answers with immediate feedback.
- FR-25: Progress tracking — progress is recorded per Learner per Course, updating as each Lesson/Quiz/Exercise completes, and persists indefinitely.

**4.5 Certificates**
- FR-26: Certificate on completion — completing all required Lessons/Quizzes/Exercises issues a downloadable Certificate with Learner name, Course title, Instructor name, and completion date.
- FR-27: Post-completion rating prompt — completing a Course prompts the Learner to rate/review it.

**4.6 Discussion**
- FR-28: Post comments — a signed-in Learner can post a Comment on a Course or a specific Lesson.
- FR-29: View comments — Comments on a Course/Lesson are visible to any enrolled Learner and the Instructor, in flat chronological order.

**4.7 Ratings & Reviews**
- FR-30: Rate and review — an enrolled Learner can leave a 1–5 star Rating and optional written Review, once per Course.
- FR-31: Aggregate display — the Course detail page displays aggregate Rating and individual written Reviews.

**4.8 Moderation**
- FR-32: Admin moderation — the Admin can view and remove any Comment, Rating/Review, or Course; removal is visible to the content's author.

**4.9 Internationalization**
- FR-33: Bilingual UI — all platform UI is available in English and Arabic with correct RTL layout when Arabic is active; switching language does not require re-login or lose in-progress state.
- FR-34: Course content language — Course content is authored in whichever language the Instructor chooses (not auto-translated); each Course carries a `contentLanguage` tag (per Architecture AD-9).

### NonFunctional Requirements

- NFR1: Video delivery performance — Video Lessons must start playback promptly with adaptive quality delivery via Cloudflare Stream (draft target: time-to-first-frame under 3s on typical broadband).
- NFR2: Code execution security — Interactive Code Exercises must run learner-submitted code in a sandboxed environment with enforced CPU/memory/time limits and no network egress; a launch-blocking prerequisite, not a later hardening pass.
- NFR3: Data-loss prevention — Autosave and upload status exist to eliminate silent data loss during authoring; treated as a reliability requirement.
- NFR4: Upload security — Video/PDF uploads are validated for file type and size before processing; no executable or unexpected file types accepted; per-Lesson/per-Instructor caps enforced at the same layer.
- NFR5: Accessibility — course text/video content usable with screen readers and keyboard navigation where feasible; full WCAG 2.1 AA is aspirational, not a v1 gate; no committed caption/transcript support.
- NFR6: Bilingual/RTL correctness — RTL Arabic rendering is first-class across every UI surface (course-builder outline, drag-reorder, video player, progress bar, transactional emails, Certificate rendering); code blocks/console stay LTR; the embedded Cloudflare Stream player chrome is outside Sanabel's localization control.
- NFR7: Availability — no formal uptime SLA, backup/disaster-recovery posture, or on-call/monitoring is defined for v1; consistent with solo-maintained launch scale.

### Additional Requirements

*(from Architecture Spine / Solution Design — no starter/greenfield template is specified; the project is built from scratch on the stack below.)*

- Modular monolith paradigm: one Next.js 16 app, one Postgres (Neon) database; domain modules under `lib/modules/*` each own their own schema slice and service layer; `app/` route/UI code never queries the database directly (AD-1).
- Module ownership map is fixed and must be respected by every epic: Accounts (User, Session, Role); Course Authoring (Course, Module, Lesson); Learning Experience (Enrollment, Progress, Attempt, completion computation); Certificates (Certificate); Discussion (Comment); Ratings (Rating); Discovery (read-only composition, no tables); Moderation (soft-delete actions via other modules' service fns, no tables) (AD-2). **Note:** epics are organized by user journey, not 1:1 by module — `Enrollment` is owned by the Learning Experience module per AD-2, but is built in **Epic 3** ("Course Discovery & Enrollment") via Story 3.3, not Epic 4 ("Learning Experience"). Sprint Planning should not assume an epic maps to exactly one module.
- Cross-module access only through a module's exported service functions — never a raw query against another module's schema (AD-3).
- Autosave/concurrency contract: exactly two autosave field-groups per Lesson (outline metadata; content body), each debounced with its own optimistic version; last-write-wins per field-group (AD-4).
- Upload lifecycle contract: one canonical `queued | processing | ready | failed` status on the Lesson's media record; video status driven by Cloudflare Stream webhooks, PDF status set synchronously after server-side validation; FR-11 caps enforced server-side once, at that media kind's one upload-initiation Route Handler (one for video, one for PDF) — never duplicated per calling UI surface, never re-implemented client-side (AD-5).
- Role/authorization contract: Learner/Instructor/Admin as additive role flags on one Account row; Better Auth DB-backed sessions (not JWT) so role revocation takes effect on next request; every module authorizes via shared `requireRole()` (throws) / `can()` (returns boolean) helpers — no module writes its own check (AD-6).
- Completion/certificate-eligibility contract: one canonical `isLessonComplete()` / `isCourseComplete()` computation owned by Learning Experience; every Lesson carries `required: boolean` (default true); Certificate issuance is a persisted one-time write (insert on first true), not recomputed live (AD-7).
- Code Execution Service boundary: grading routed through exactly one `submit(exerciseId, code) → {pass|fail, message}` contract; v1 scope is SQL only via PGlite run inside a dedicated Node `worker_thread` (never a shared serverless instance); wall-clock `worker.terminate()` timeout plus a Postgres `statement_timeout` as defense-in-depth (AD-8). Quiz grading (FR-24) follows the identical contract shape — `submitQuiz(lessonId, answers) → {pass|fail, score, message}`, evaluated server-side only; the correct-answer key is never sent to the client (AD-8).
- Certificate content contract: `learnerName`, `courseTitle`, `instructorName`, `completionDate` are copied onto the Certificate row as a frozen snapshot at issuance time and never re-derived live from current Account/Course data by any surface (AD-7).
- i18n/content-language contract: UI strings only in next-intl message catalogs (`en.json`/`ar.json`); Course content stored as single free-text fields, never per-locale columns; every Course carries `contentLanguage: 'en' | 'ar'` set by the Instructor at creation (AD-9).
- Visibility/access-gating contract: one shared `canQueryCourse()` / `canAccessLesson()` function is the sole source of truth for Public/Unlisted/Enrolled/soft-deleted gating across Discovery, the Course detail page, Lesson content routes, and the Rating form (AD-10).
- Soft-delete contract: removing a Course/Module/Lesson/Comment/Rating — by any actor, any surface — is always a soft-delete (`removedAt`/status flag), never a hard delete; a soft-deleted Lesson is excluded from `isCourseComplete()` going forward without retroactively invalidating existing Progress/Certificate rows (AD-11).
- Environments: one production environment (Vercel + Neon primary branch); every PR gets a Vercel preview deploy wired to an ephemeral Neon database branch, torn down on merge/close (AD-12).
- Uniqueness/idempotency enforced at the database level: unique constraint on `Enrollment(accountId, courseId)`, `Rating(accountId, courseId)`, and `Certificate(enrollmentId)` with an atomic insert-if-not-exists issuance path (AD-13).
- Stack setup requirements: Next.js 16 (App Router, React 19; 15.5 Maintenance LTS fallback), TypeScript 5.x, Tailwind v4 + shadcn/ui, Drizzle ORM, Postgres 17 on Neon, Better Auth (email/password + Google + GitHub), next-intl, Cloudflare Stream, Cloudflare R2, PGlite (`@electric-sql/pglite`), Resend + React Email, Playwright (headless HTML-to-PDF for Certificates), deployed on Vercel.
- Data conventions: camelCase TS identifiers / snake_case DB columns; UUIDv7 IDs on every table; UTC `timestamptz` timestamps; Server Actions return a discriminated union `{ok:true,data} | {ok:false,error:{code,message}}`, never throw across the client boundary.
- Search: Postgres native full-text search (`tsvector` on Course title/description/category) — no dedicated search service (matches FR-17).

### UX Design Requirements

- UX-DR1: Implement the full design token system (colors, typography, spacing, radius) from DESIGN.md with light and dark mode variants for every token; mode follows system `prefers-color-scheme` by default, user-overridable.
- UX-DR2: Use shadcn/ui primitives (Button, Card, Dialog, Sheet, Tabs, Badge, Progress, Tooltip, DropdownMenu, Toast, Separator, Skeleton) with brand-layer color/radius overrides only — no rebuild from scratch.
- UX-DR3: Build the Sanabel-specific components: Course card (16:9 thumbnail, title, instructor, language badge, progress bar when enrolled), Video player chrome wrapper (speed control, caption toggle, resume indicator over the Cloudflare Stream embed), Code editor (Monaco-style, author + take modes), Language toggle, Certificate-required toggle (per-lesson, defaults true), Comment thread (flat, chronological).
- UX-DR4: Build every layout with CSS logical properties (`margin-inline-start`, not `margin-left`/`right`) so the full UI — nav, course-builder outline, forms, video player control bar, progress bar, comment threads, certificates — flips correctly under RTL.
- UX-DR5: Fixed-LTR carve-outs regardless of page direction: the code editor/code blocks/console, and numeral-bearing widgets (video scrubber elapsed-time readout) — numerals always render as Western Arabic digits (0–9).
- UX-DR6: Directional icon mirroring under RTL for back/forward chevrons, the drag-reorder handle, and the "Continue" arrow; non-mirroring for play/pause, checkmarks, and the certificate/download icon.
- UX-DR7: Bilingual typography pairing — Inter + IBM Plex Sans Arabic in one font stack per text role (display, heading-lg, heading-md, body, body-sm, label); JetBrains Mono for code, always LTR regardless of active language.
- UX-DR8: Verify WCAG AA color contrast (4.5:1 body text, 3:1 large text) for all text-on-surface pairings, and for `{colors.primary}`/`{colors.accent}` button label text, in both light and dark mode.
- UX-DR9: Warning and error states are always paired with an icon and text label — never signaled by color alone.
- UX-DR10: Mobile-first design and verification for every learner-facing surface (course home, video player, quiz, code-exercise console, certificate) — required by FR-13's mobile-accurate "preview as learner."
- UX-DR11: Accessibility floor: full keyboard operability including a keyboard equivalent for every drag-and-drop reorder (focus row + move up/down control or arrow-key reordering with audible/visible confirmation); logical focus order per active language direction; role + accessible name on every interactive element; correct `lang` attribute per bilingual text run; `aria-live` announcements for autosave status and upload status transitions; minimum touch/click target size; fully keyboard-operable video player controls exposing their state to assistive tech.
- UX-DR12: Autosave UX pattern — no save button anywhere in the builder; save on pause (~600–800ms after last edit); header status cycles "Editing…" → "Saved." (text only, no interrupting modal/toast), announced via `aria-live`.
- UX-DR13: Upload-with-retry UX pattern — status always visible (queued/processing/ready/failed), never inferred from silence; failed state shows an inline Retry action without requiring re-selection of the file.
- UX-DR14: Global language switcher in the header on every surface; switching re-renders UI chrome without a page reload and without dropping in-progress form/quiz state or requiring re-login.
- UX-DR15: Defined empty/cold-start states: Browse (zero Public courses — inviting empty state pointing prospective Instructors to create the first course; no-match search/filter keeps filters visible/adjustable), My Courses (zero courses — single "Create your first course" action), Instructor analytics (no data yet), Comments (none yet), Admin moderation (nothing flagged — neutral, not an implied backlog).
- UX-DR16: Defined completion-moment states — course home "just completed" surfaces the certificate-ready state and rating/review prompt immediately (not on next login); "Continue" always resumes at the exact last incomplete lesson after any absence, with no re-onboarding.
- UX-DR17: Defined already-done states — Course detail page swaps "Enroll" for "Continue" when already enrolled (no duplicate-enrollment dead end); Rating & review shows the Learner's existing rating/review in an editable state instead of re-prompting.
- UX-DR18: Microcopy voice/tone per EXPERIENCE.md's Do/Don't table — explicit progress counts ("2 of 14 lessons complete"), explanatory failure hints ("Almost — you forgot the WHERE clause"), no dead-end errors, consistent directness in both English and Arabic (no casual-English/formal-Arabic mismatch).

### FR Coverage Map

FR-1: Epic 1 - Email/password authentication
FR-2: Epic 1 - Social login (Google, GitHub)
FR-3: Epic 1 - Role model (Learner/Instructor/Admin)
FR-4: Epic 1 - Admin grants/revokes Instructor role
FR-5: Epic 1 - Profile basics (display name, Instructor bio)
FR-33: Epic 1 - Bilingual EN/AR UI with RTL
FR-6: Epic 2 - Low-friction course creation
FR-7: Epic 2 - Outline-first structuring (Modules/Lessons)
FR-8: Epic 2 - Drag-reorder outline
FR-9: Epic 2 - Multi-format lesson authoring (5 Lesson Types)
FR-10: Epic 2 - Upload/processing status
FR-11: Epic 2 - Upload limits
FR-12: Epic 2 - Autosave
FR-13: Epic 2 - Learner-accurate preview
FR-14: Epic 2 - Publish with visibility and category
FR-15: Epic 2 - Post-publish content changes
FR-16: Epic 2 - Instructor analytics
FR-34: Epic 2 - Course content language tag
FR-17: Epic 3 - Browse and search
FR-18: Epic 3 - Course detail page (pre-signup)
FR-19: Epic 3 - Enrollment
FR-20: Epic 4 - Progress display
FR-21: Epic 4 - Resume where left off
FR-22: Epic 4 - Video playback controls
FR-23: Epic 4 - Interactive exercise grading (Code Execution Service)
FR-24: Epic 4 - Quiz grading
FR-25: Epic 4 - Progress tracking
FR-26: Epic 5 - Certificate on completion
FR-27: Epic 5 - Post-completion rating prompt
FR-30: Epic 5 - Rate and review
FR-31: Epic 5 - Aggregate rating display
FR-28: Epic 6 - Post comments
FR-29: Epic 6 - View comments
FR-32: Epic 7 - Admin moderation

## Epic List

### Epic 1: Accounts & Bilingual Shell
Users can sign up and sign in (email/password or Google/GitHub), see role-gated navigation (Learner/Instructor/Admin), and use the product fully in English or Arabic with correct RTL layout from the very first screen. Opens with Story 1.0, a dedicated technical-enabler story carrying the one-time project scaffold (Next.js 16, Drizzle/Postgres on Neon, Better Auth, next-intl + RTL layout primitives, DESIGN.md token/component system, Vercel deployment + AD-12's preview-branch pipeline) since no starter template is specified — the scaffold has its own acceptance criteria rather than being implicitly assumed inside Story 1.1.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-33

### Epic 2: Course Authoring
An Instructor can create a course from just a title/description/category, structure it as a Modules → Lessons outline with drag-reorder, author all five Lesson Types (Video, Text, PDF, Quiz, Interactive Code Exercise) with continuous autosave and upload status/limits, preview it exactly as a learner would (including mobile), publish with visibility and category, keep editing after publish without disrupting enrolled learners, and view per-lesson analytics. Realizes UJ-1 end-to-end.
**FRs covered:** FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-34

### Epic 3: Course Discovery & Enrollment
Any visitor can browse and search Public courses by category, view a course's full detail page (instructor, outline, ratings) without signing in, and a signed-in Learner can enroll in any reachable course at no cost. Realizes the first half of UJ-2.
**FRs covered:** FR-17, FR-18, FR-19

### Epic 4: Learning Experience
An enrolled Learner sees overall and per-lesson progress, resumes exactly where they left off from any device, plays videos with speed control and resume-from-position, and gets immediate graded feedback on quizzes and interactive SQL exercises (via the sandboxed Code Execution Service). Realizes the second half of UJ-2.
**FRs covered:** FR-20, FR-21, FR-22, FR-23, FR-24, FR-25

### Epic 5: Certificates & Ratings
Completing a course is a real payoff: the Learner receives a downloadable certificate and is prompted to rate/review the course; the aggregate rating and reviews then show on the course detail page for the next learner. Realizes UJ-2's climax.
**FRs covered:** FR-26, FR-27, FR-30, FR-31

### Epic 6: Discussion
A signed-in Learner can post and read comments on a course or a specific lesson, visible to enrolled learners and the course's instructor in chronological order.
**FRs covered:** FR-28, FR-29

### Epic 7: Admin Moderation
Ahmed (Admin) can view and remove any comment, rating/review, or course, with removal visible to the content's author.
**FRs covered:** FR-32

## Epic 1: Accounts & Bilingual Shell

Users can sign up and sign in (email/password or Google/GitHub), see role-gated navigation (Learner/Instructor/Admin), and use the product fully in English or Arabic with correct RTL layout from the very first screen.

### Story 1.0: Project Scaffold & Deployment Pipeline

*Technical enabler story — no end-user persona; exists so the scaffold work Architecture assigns to Epic 1 (no starter template specified, AD-12) has its own acceptance criteria instead of being implicitly assumed inside Story 1.1.*

As the builder of Sanabel,
I want a working, deployed project skeleton with the full stack wired together,
So that every subsequent story in Epic 1 onward is implementing product features on top of a verified foundation, not discovering scaffold gaps mid-story.

**Acceptance Criteria:**

**Given** a fresh clone of the repository
**When** dependencies are installed and the dev server is started
**Then** Next.js 16 (App Router, React 19, TypeScript 5.x, Tailwind v4 + shadcn/ui) serves a running local app with no build errors

**Given** the project's database configuration
**When** the app connects to Postgres
**Then** it connects to a Neon Postgres 17 database via Drizzle ORM, and Drizzle's migration tooling successfully applies an initial (even if still-empty) schema

**Given** the project's auth configuration
**When** Better Auth is initialized
**Then** it is wired for DB-backed sessions (not JWT) with email/password and Google/GitHub OAuth providers configured (credentials may be placeholder/dev values at this stage — Story 1.1/1.2 build the actual sign-up/sign-in flows on top of this)

**Given** the project's i18n configuration
**When** a placeholder route is rendered
**Then** next-intl serves both an `en` and `ar` locale segment, `dir="rtl"` applies correctly when Arabic is active, and `en.json`/`ar.json` message catalogs exist and load

**Given** DESIGN.md's token system
**When** the base Tailwind theme is inspected
**Then** the color, typography, spacing, and radius tokens from DESIGN.md's frontmatter are wired into the Tailwind config (not hard-coded per component), and light/dark mode both render using them

**Given** a pull request is opened against the repository
**When** CI runs
**Then** it builds successfully and Vercel creates a preview deployment wired to an ephemeral Neon database branch (a schema+data fork of primary), per AD-12

**Given** a pull request is merged or closed
**When** cleanup runs
**Then** its ephemeral Neon preview branch is torn down, per AD-12

**Given** the `main` branch
**When** it is deployed
**Then** it serves the one production environment (Vercel + Neon primary branch) at a real, reachable URL

### Story 1.1: Email/Password Sign Up & Sign In

As a visitor,
I want to sign up and sign in with an email and password,
So that I have a persistent account on Sanabel.

**Acceptance Criteria:**

**Given** I am an unauthenticated visitor
**When** I submit the sign-up form with a valid, unused email and password
**Then** an Account is created with the Learner role, I am signed in, and a verification email is sent to my address

**Given** I have just signed up
**When** I have not yet clicked the verification link
**Then** my account exists and I can use the product as a Learner, but it is not yet eligible for social-login merge (see Story 1.2)

**Given** I submit the sign-up form with an email that already has an account
**When** the form is submitted
**Then** I see a clear rejection message and a link into the sign-in form instead

**Given** I am a registered user who forgot my password
**When** I request a password reset with my email
**Then** I receive a reset email and can set a new password, after which I can sign in with it

**Given** I enter an incorrect email/password combination
**When** I submit the sign-in form
**Then** I see a clear error message and remain on the sign-in form

### Story 1.2: Social Login with Google & GitHub

As a visitor,
I want to sign up and sign in using my Google or GitHub account,
So that I don't need to create and remember a new password.

**Acceptance Criteria:**

**Given** I am an unauthenticated visitor with no existing Sanabel account
**When** I complete Google or GitHub OAuth sign-in
**Then** a new Account is created with the Learner role, using the email and display name from the OAuth provider

**Given** I have an existing email/password account with a **verified** email
**When** I sign in via Google or GitHub using that same email
**Then** I am signed into the same existing Account, not a new duplicate one

**Given** I have an existing email/password account with an **unverified** email
**When** someone signs in via Google or GitHub using that same email
**Then** a separate account is created rather than auto-merging, closing the pre-registration account-takeover path

**Given** I am signed in via a social provider
**When** I view my account
**Then** my role (Learner by default) and profile basics behave identically to an email/password account

### Story 1.3: Role Model & Role-Gated Navigation

As a Learner,
I want the navigation to only show me what I'm allowed to use,
So that I'm not confused by options I can't access.

**Acceptance Criteria:**

**Given** I am signed in as a plain Learner (no Instructor or Admin grant)
**When** I view any page's navigation
**Then** I never see "Create a course," the My Courses authoring dashboard, or the Admin moderation console — not even in a disabled/greyed form

**Given** I am signed in as a Learner without the Instructor role
**When** I navigate directly to an Instructor-only route by URL
**Then** I am blocked from the Instructor surface (not just hidden from nav)

**Given** I am signed in as an Instructor
**When** I view navigation
**Then** I see Instructor-only surfaces (My Courses, course builder) in addition to Learner surfaces

**Given** I am signed in as the Admin (Ahmed)
**When** I view navigation
**Then** I see the Admin moderation console in addition to Learner/Instructor surfaces I hold

**Given** any new account is created (email/password or social)
**When** the account is created
**Then** it holds the Learner role only, by default

### Story 1.4: Admin Grants and Revokes Instructor Role

As the Admin,
I want to grant or revoke the Instructor role on any account,
So that I control who can author courses without a self-service application flow.

**Acceptance Criteria:**

**Given** I am signed in as the Admin
**When** I view an account and grant it the Instructor role
**Then** that account immediately gains access to Instructor-only surfaces

**Given** an account currently holds the Instructor role
**When** I, as Admin, revoke that role
**Then** the account loses access to Instructor-only surfaces on its very next request — not after a delay or token expiry (DB-backed session, AD-6)

**Given** I am signed in as a Learner (not Admin)
**When** I attempt to access the role-management surface directly by URL
**Then** I am blocked from it

**Given** there is no self-service Instructor-request flow in v1
**When** a Learner looks for a way to request Instructor access in-product
**Then** no such flow exists (grants happen out-of-band, per FR-4's note)

### Story 1.5: Profile Basics

As a user,
I want a display name, and a bio if I'm an Instructor,
So that other users can identify me and Instructors can present themselves credibly.

**Acceptance Criteria:**

**Given** I am any signed-in user
**When** I view or edit my profile
**Then** I can set and update my display name

**Given** I hold the Instructor role
**When** I view or edit my profile
**Then** I additionally have a short bio field, distinct from the display name

**Given** I am a Learner without the Instructor role
**When** I view my profile
**Then** no bio field is shown or editable

**Given** an Instructor has set a display name and bio
**When** their profile data is read by another module (e.g. a future course detail page)
**Then** both fields are available for that module to render

### Story 1.6: Bilingual UI Shell & Language Switcher

As a user,
I want to use Sanabel in English or Arabic with correct right-to-left layout,
So that I can use the product comfortably in my own language.

**Acceptance Criteria:**

**Given** I am on any page of the product
**When** I open the global header's language toggle and select Arabic
**Then** all UI chrome (navigation, buttons, system messages, account flows) re-renders in Arabic with `dir="rtl"`, using logical layout properties so the whole page mirrors correctly — not just mirrored text

**Given** I am mid-way through filling an authenticated form (e.g. a partially-filled field)
**When** I switch language
**Then** my in-progress state is preserved — no page reload, no re-login, no lost input

**Given** I am viewing the product in Arabic
**When** I look at numerals (counts, dates, etc.) anywhere shown so far (e.g. profile, account settings)
**Then** they render as Western Arabic digits (0–9), not Eastern Arabic-Indic digits

**Given** I am using a screen reader
**When** I navigate the page in either language
**Then** interactive elements expose a role and accessible name, and text runs carry the correct `lang` attribute per language

**Given** I am on a touch device
**When** I interact with any button, link, or form control
**Then** it meets a minimum touch/click target size consistent with mobile-first rendering

**Given** my system `prefers-color-scheme` is set to dark or light
**When** I load Sanabel without having chosen a theme
**Then** the UI follows my system preference by default, using DESIGN.md's light/dark token pairs, and I can override it manually

**Given** I view any interactive element (buttons, form fields, links)
**When** I check text/background color pairings
**Then** they meet WCAG AA contrast (4.5:1 body text, 3:1 large text) in both light and dark mode

## Epic 2: Course Authoring

An Instructor can create a course, structure it as an outline, author all five Lesson Types with continuous autosave and upload status, preview it as a learner would, publish it, keep editing after publish, and view analytics. Realizes UJ-1.

### Story 2.1: Low-Friction Course Creation

As an Instructor,
I want to create a course by providing only a title, one-line description, and category,
So that I can start building without a heavyweight setup form standing in my way.

**Acceptance Criteria:**

**Given** I hold the Instructor role
**When** I click "Create a course" and submit a title, one-line description, and Category
**Then** a Course record is created with no other field required, and I land in the outline editor

**Given** I am creating a course
**When** I fill in the creation form
**Then** I must also choose the course's content language (`contentLanguage`: English or Arabic) — no separate language step exists later

**Given** I am a Learner without the Instructor role
**When** I attempt to reach the course-creation flow
**Then** I am blocked (enforced by Story 1.3's role gate)

**Given** I have just created a course
**When** I view "My Courses"
**Then** the new course appears there, unpublished

**Given** I am an Instructor with zero courses yet
**When** I first open "My Courses"
**Then** I see a single "Create your first course" primary action, not an empty grid

### Story 2.2: Outline-First Module & Lesson Structuring

As an Instructor,
I want to add Modules and Lessons to my course as a nested outline, naming a Lesson before writing its content,
So that I can see the whole course take shape before authoring anything.

**Acceptance Criteria:**

**Given** I am in the outline editor for my course
**When** I add a Module
**Then** it appears in the outline, ordered after existing Modules, with no content required beyond a name

**Given** I am viewing a Module
**When** I add a Lesson with only a title (no type or content chosen yet)
**Then** the Lesson is created in an unpublished/incomplete state, and adding it never blocks adding further Lessons

**Given** I am editing outline metadata (Module/Lesson titles, structure)
**When** I pause typing for ~600–800ms
**Then** the change autosaves automatically with no explicit save button, and the header cycles "Editing…" → "Saved." (announced via `aria-live`)

**Given** I close or crash my browser tab mid-edit
**When** I reopen the outline editor
**Then** the last-autosaved outline state is intact — nothing typed before the last autosave is lost

**Given** the outline editor is loading
**When** data has not yet resolved
**Then** skeleton rows matching the expected Module/Lesson shape are shown, not a blank screen

**Given** I am viewing a Lesson's settings
**When** I check its certificate-eligibility toggle
**Then** it defaults to required = true, and I can opt the Lesson *out* of certificate eligibility rather than opting each Lesson in — this value feeds the shared `isCourseComplete()` computation (Epic 4) regardless of Lesson Type

### Story 2.3: Drag-Reorder Outline

As an Instructor,
I want to reorder Modules and Lessons by dragging them in the outline,
So that I can restructure my course without opening each item individually.

**Acceptance Criteria:**

**Given** I am viewing the outline editor
**When** I drag a Lesson to a new position within its Module, or a Module to a new position in the course
**Then** the new order is reflected immediately and autosaved, without opening the dragged item

**Given** I am using Arabic (RTL)
**When** I drag-reorder
**Then** drag direction and drop-indicator placement mirror correctly for RTL

**Given** I prefer or need keyboard-only interaction
**When** I focus a Module or Lesson row
**Then** an explicit "move up / move down" control (or arrow-key reordering) is available as a full keyboard equivalent to dragging, with a visible/audible confirmation of the new position

### Story 2.4: Video Lesson Authoring & Upload Lifecycle

As an Instructor,
I want to upload a video as a Lesson's content and always see its processing status,
So that I never wonder whether an upload silently failed.

**Acceptance Criteria:**

**Given** I open a Lesson and choose the Video Lesson Type
**When** I upload a video file
**Then** the Lesson's media record shows status `queued`, then `processing`, then `ready` (driven by Cloudflare Stream webhooks) — always one of the four canonical states, never silent

**Given** my video upload exceeds the per-Lesson or per-Instructor cap
**When** I attempt the upload
**Then** it is rejected at upload time with a clear message — never silently truncated or accepted then billed

**Given** a video upload's processing fails
**When** I view the Lesson
**Then** I see a clear failed state — an icon and text label together, never color alone — with an inline Retry action that re-attempts without requiring me to re-select the file

**Given** I am editing this Lesson's video content
**When** I make a change (e.g. replace the video, edit a caption note)
**Then** it autosaves on pause as its own content-body field group, independent from the Lesson's outline metadata (title/order)

**Given** I set this Lesson's content to Video
**When** I check the Lesson's type
**Then** it has exactly one Lesson Type — Video — at a time

### Story 2.5: Text Lesson Authoring

As an Instructor,
I want to write a text Lesson with syntax-highlighted code blocks,
So that I can teach concepts that are better explained in writing, including code samples.

**Acceptance Criteria:**

**Given** I open a Lesson and choose the Text Lesson Type
**When** I write rich text content, including a fenced code block (e.g. SQL)
**Then** the code block renders with syntax highlighting, always left-to-right and monospace regardless of the page's active language direction

**Given** I am editing this Lesson's text content
**When** I pause typing
**Then** it autosaves as its own content-body field group, independent from outline metadata

**Given** my course's content language is Arabic
**When** I write the Lesson's prose in Arabic
**Then** the prose renders RTL while any embedded code block stays LTR within the same Lesson

### Story 2.6: PDF Lesson Authoring & Upload Lifecycle

As an Instructor,
I want to upload a PDF as a Lesson's content and see its processing status,
So that document-based material is treated with the same reliability as video.

**Acceptance Criteria:**

**Given** I open a Lesson and choose the PDF Lesson Type
**When** I upload a PDF file
**Then** it is validated server-side for file type and size, and status is set synchronously to `ready` on success or `failed` on validation failure — never left ambiguous

**Given** my PDF upload exceeds the per-Lesson or per-Instructor cap, or is not a valid PDF
**When** I attempt the upload
**Then** it is rejected at upload time with a clear message; no executable or unexpected file type is ever accepted

**Given** a PDF upload fails validation
**When** I view the Lesson
**Then** I see a clear failed state — an icon and text label together, never color alone — with an inline Retry action

**Given** I am editing this Lesson's PDF content
**When** I replace the file
**Then** it autosaves as its own content-body field group, independent from outline metadata

### Story 2.7: Quiz Lesson Authoring

As an Instructor,
I want to build a multiple-choice quiz as a Lesson's content,
So that I can check learner understanding with auto-graded questions.

**Acceptance Criteria:**

**Given** I open a Lesson and choose the Quiz Lesson Type
**When** I add one or more multiple-choice questions, each with answer options and a marked correct answer
**Then** the quiz is saved as this Lesson's content, ready for auto-grading when a Learner takes it (grading itself is delivered in Epic 4)

**Given** I am editing quiz questions/options
**When** I pause editing
**Then** it autosaves as its own content-body field group, independent from outline metadata

**Given** I have not yet added any questions
**When** I view this Lesson in the outline
**Then** it is visibly incomplete, consistent with FR-7's "title-only" allowance, without blocking other outline work

### Story 2.8: Interactive Code Exercise Authoring

As an Instructor,
I want to define an interactive SQL exercise with a sample dataset and expected result,
So that learners can practice writing real queries and get automated pass/fail feedback.

**Acceptance Criteria:**

**Given** I open a Lesson and choose the Interactive Code Exercise Lesson Type
**When** I define starter code, a sample dataset, and the expected output/grading logic
**Then** the exercise definition is saved as this Lesson's content, conforming to the shared `submit(exerciseId, code) → {pass|fail, message}` contract that Learning Experience will invoke when a Learner takes it (Epic 4)

**Given** v1 scope is fixed to SQL only
**When** I define an exercise
**Then** I am not offered any other language, and the dataset is loaded into an ephemeral, in-memory sandbox with no network egress at grading time (grading behavior itself ships in Epic 4)

**Given** I am editing this exercise's definition
**When** I pause editing
**Then** it autosaves as its own content-body field group, independent from outline metadata

### Story 2.9: Learner-Accurate Preview

As an Instructor,
I want to preview my course exactly as a Learner would see it, including on mobile, before publishing,
So that I can catch layout or content problems before anyone else sees them.

**Acceptance Criteria:**

**Given** I am in the outline editor for a course, published or not
**When** I toggle "preview as learner"
**Then** I see the course rendered in the Learner-facing layout — module list, lesson content per type — without the course being published

**Given** I am in preview mode
**When** I switch to a mobile viewport width
**Then** every previewed surface (video lesson, text lesson, PDF, quiz, code exercise) renders at mobile-accurate layout, matching how a real Learner's phone would render it

**Given** I am in preview mode
**When** I view a Quiz or Interactive Code Exercise Lesson
**Then** its content and layout render accurately; live grading/submission becomes fully functional once Epic 4 ships, so preview here is a content/layout check, not a substitute for taking the course

### Story 2.10: Publish with Visibility and Category

As an Instructor,
I want to publish my course as Public or Unlisted with a required Category,
So that I control who can find it, with no pricing step ever standing in the way.

**Acceptance Criteria:**

**Given** I am ready to publish my course
**When** I open the publish flow
**Then** I must choose a visibility (Public or Unlisted) and a Category is required; no pricing or paid-tier option is presented anywhere in this flow

**Given** I publish my course as Unlisted
**When** the course is live
**Then** it does not appear in browse/search results but remains reachable via direct link

**Given** I publish my course as Public
**When** the course is live
**Then** it becomes discoverable via browse/search (once Epic 3 ships) under its assigned Category

**Given** I have published my course
**When** I view "My Courses"
**Then** its published state and visibility are clearly shown

### Story 2.11: Post-Publish Content Changes

As an Instructor,
I want to keep adding Modules and Lessons to an already-published course,
So that I can ship incrementally without disrupting learners already enrolled.

**Acceptance Criteria:**

**Given** my course is already published and has enrolled Learners
**When** I add a new Module or Lesson to the outline
**Then** it is added without disrupting any currently-enrolled Learner's existing progress

**Given** a Learner is currently enrolled and not yet complete
**When** I publish new content
**Then** the new Lessons appear automatically in their outline and progress bar

**Given** a Learner already completed the course and received a Certificate before I added new content
**When** the new content is published
**Then** the newly added Lessons are not required for that Learner, and their already-issued Certificate is not retroactively invalidated by this change (upheld once Epic 5 ships Certificate issuance)

### Story 2.12: Instructor Analytics

As an Instructor,
I want to see basic engagement data for my published course,
So that I can tell where learners are dropping off and improve it.

**Acceptance Criteria:**

**Given** I have a published course with learner activity
**When** I open its Analytics view
**Then** I see, per Lesson, at least a view count and a completion count, from which drop-off is derivable

**Given** my course has no learner activity yet
**When** I open Analytics
**Then** I see "No views yet — check back once learners find this course," never an empty chart with no explanation

**Given** I am the Instructor of Course A
**When** I attempt to view analytics for Course B (not mine)
**Then** I am blocked from seeing it

## Epic 3: Course Discovery & Enrollment

Any visitor can browse and search Public courses, view a course's full detail page without signing in, and a signed-in Learner can enroll at no cost. Realizes the first half of UJ-2.

### Story 3.1: Browse and Search Public Courses

As a visitor,
I want to browse and search Public courses by category or keyword,
So that I can find something worth learning without needing an account first.

**Acceptance Criteria:**

**Given** I am a visitor, signed in or not
**When** I open Browse
**Then** I see Public courses, filterable by Category, and Unlisted courses never appear in this list

**Given** I search by keyword
**When** the search runs
**Then** it matches against Course title, one-line description, and Category at minimum

**Given** there are zero Public courses yet (cold start)
**When** I open Browse
**Then** I see an inviting empty state pointing prospective Instructors to create the first course — never a blank grid

**Given** my search or filter matches nothing
**When** results render
**Then** I see "No courses match — try a different category or language," with filters still visible and adjustable

**Given** I filter by course-language (`contentLanguage`)
**When** I apply the filter
**Then** results narrow to courses authored in that language

### Story 3.2: Course Detail Page

As a visitor,
I want to see a course's full detail page before signing up,
So that I can decide if it's worth my time before committing to an account.

**Acceptance Criteria:**

**Given** I am a visitor, signed in or not
**When** I open a Course's detail page (via Browse, a direct link, or a shared link)
**Then** I see its title, Instructor name/bio, preview (if provided), the full Module/Lesson outline (titles only), and the aggregate rating with individual reviews — all without signing in

**Given** I am viewing the detail page
**When** I try to access actual Lesson content (video/text/PDF/quiz/exercise body) from here
**Then** I cannot — only titles and structure are visible pre-Enrollment; content requires Enrollment (Epic 4)

**Given** the course is Unlisted
**When** I reach its detail page via direct link
**Then** it renders normally, even though it wouldn't have appeared in Browse

**Given** the course was soft-deleted (Admin moderation, Epic 7) or is not Public/Unlisted-reachable
**When** I attempt to view its detail page
**Then** I am shown that the course is unavailable, not a broken page

### Story 3.3: Enrollment

As a signed-in Learner,
I want to enroll in a course I can reach,
So that I get full access to its Lesson content at no cost.

**Acceptance Criteria:**

**Given** I am signed in
**When** I click "Enroll" on a Course detail page
**Then** an Enrollment is created immediately at no cost, with no separate payment or approval step, and I am taken into the course

**Given** I am not signed in
**When** I click "Enroll"
**Then** I am prompted to sign up or sign in first (Epic 1 flows), then returned to complete enrollment

**Given** I am already enrolled in this course
**When** I view its detail page
**Then** the "Enroll" button is replaced with "Continue" — no duplicate-enrollment dead end, and the database enforces at most one Enrollment per (account, course) pair

**Given** I am enrolled in an Unlisted course
**When** I check my enrollment
**Then** it behaves identically to a Public course's enrollment — visibility only ever affects discoverability, never access once enrolled

## Epic 4: Learning Experience

An enrolled Learner sees accurate progress, resumes exactly where they left off, plays video with full controls, and gets immediate graded feedback on quizzes and interactive SQL exercises. Realizes the second half of UJ-2.

### Story 4.1: Progress Tracking & Display

As an enrolled Learner,
I want to see my overall course progress and per-lesson completion, and have it persist forever,
So that I always know where I stand and never lose that record.

**Acceptance Criteria:**

**Given** I am enrolled in a course
**When** I complete a Lesson, pass a Quiz, or pass an Interactive Code Exercise
**Then** my Progress record updates immediately via the single canonical `isLessonComplete()` computation, and this is the only code path that marks a Lesson complete

**Given** I have completed some but not all Lessons
**When** I view Course Home
**Then** I see an overall percentage progress bar and per-Lesson completion checkmarks in the outline, and both always agree — completing a Lesson updates both simultaneously

**Given** a Lesson was later soft-deleted by its Instructor (Epic 2's post-publish editing)
**When** `isCourseComplete()` is computed going forward
**Then** the soft-deleted Lesson is excluded from the active-lesson set, without retroactively invalidating Progress that already counted it complete

**Given** my Progress record exists
**When** any amount of time passes, including weeks of inactivity
**Then** my Progress persists indefinitely, tied to my account and this Course

### Story 4.2: Resume Where Left Off

As an enrolled Learner,
I want a "Continue" control that always takes me to my last incomplete Lesson,
So that I never have to hunt for where I left off.

**Acceptance Criteria:**

**Given** I am enrolled in a course with some Lessons already complete
**When** I click "Continue" from Course Home or "My Learning"
**Then** I land directly on my last incomplete Lesson

**Given** I abandon a course mid-way and return weeks later, on a different device
**When** I click "Continue"
**Then** I resume at the exact last incomplete Lesson — no re-onboarding, no lost state

**Given** I have completed every required Lesson
**When** I view Course Home
**Then** "Continue" is replaced by the completion state (Epic 5), not a dead link to a nonexistent next Lesson

### Story 4.3: Video Playback Controls

As an enrolled Learner,
I want playback speed control and resume-from-last-position on video Lessons,
So that I can learn at my own pace without rewatching what I've already seen.

**Acceptance Criteria:**

**Given** I am watching a Video Lesson
**When** I change the playback speed
**Then** playback continues at the selected speed for the remainder of that session

**Given** I stop watching partway through a Video Lesson
**When** I return to it later, from any device
**Then** playback resumes from my last position, not from the beginning

**Given** I am using the caption toggle
**When** I enable it
**Then** Cloudflare Stream's auto-captions display, off by default with one tap/click to enable

**Given** the page is in RTL (Arabic active)
**When** I view the video player's control bar
**Then** the control bar chrome mirrors correctly per RTL layout rules, while the video content itself is unaffected

### Story 4.4: Quiz Taking & Grading

As an enrolled Learner,
I want to take a quiz and get immediate graded feedback,
So that I know right away whether I understood the material.

**Acceptance Criteria:**

**Given** I am enrolled and open a Quiz Lesson (authored in Epic 2)
**When** I answer its multiple-choice questions and submit
**Then** grading is synchronous — I get immediate feedback with no "results pending" state

**Given** I open a Quiz Lesson
**When** the quiz payload is sent to my browser
**Then** it never includes the correct-answer key; my submission is graded server-side via the `submitQuiz(lessonId, answers) → {pass|fail, score, message}` contract (Architecture AD-8), never by comparing against an answer key available client-side

**Given** I answer a question incorrectly
**When** I see the result
**Then** I get explanatory feedback — an icon and text label together, never color alone — never a bare "Incorrect" with no next action

**Given** I pass the quiz
**When** grading completes
**Then** this Quiz Lesson is marked complete via `isLessonComplete()`, feeding Story 4.1's progress computation

**Given** I have already attempted this quiz
**When** I revisit it
**Then** my prior attempt is recorded in my Attempt history

### Story 4.5: Interactive Code Exercise Taking & Grading

As an enrolled Learner,
I want to write SQL against a sample dataset and get immediate pass/fail feedback,
So that I can practice for real and know right away if my query is right.

**Acceptance Criteria:**

**Given** I am enrolled and open an Interactive Code Exercise Lesson (authored in Epic 2)
**When** I write SQL in the code editor and click Run/Check
**Then** my submission is routed through the single `submit(exerciseId, code) → {pass|fail, message}` contract — never executed inline in the request handler

**Given** my submission is graded
**When** execution runs
**Then** it happens inside a dedicated Node `worker_thread` spawned for this submission only — never a shared serverless instance whose hang would stall other learners — with the sample dataset loaded into an ephemeral in-memory PGlite instance with no network egress, discarded after grading

**Given** my query runs long or hangs
**When** it exceeds the wall-clock timeout
**Then** the worker is force-terminated via `worker.terminate()`, backed by a Postgres `statement_timeout` inside the PGlite session as a second defense layer, and I receive a fail result rather than an indefinite hang

**Given** my submission fails
**When** I see the result
**Then** I get an explanatory hint (e.g. "Almost — you forgot the WHERE clause") paired with a fail icon and label — never color alone, never a bare "Incorrect"

**Given** I pass the exercise
**When** grading completes
**Then** this Lesson is marked complete via `isLessonComplete()`, feeding Story 4.1's progress computation, and my attempt is recorded

**Given** I click Run/Check
**When** grading is in progress
**Then** the Run button shows a loading indicator — the primitive is submit → visible wait → result, never instant/local execution

## Epic 5: Certificates & Ratings

Completing a course is a real payoff: a downloadable certificate, a prompt to rate the course, and that rating showing up for the next learner. Realizes UJ-2's climax.

### Story 5.1: Certificate on Completion

As a Learner who has completed a course,
I want a downloadable certificate,
So that I have something to show for finishing.

**Acceptance Criteria:**

**Given** I complete all required Lessons, Quizzes, and Interactive Code Exercises in a course (`isCourseComplete()` returns true for the first time)
**When** completion is detected
**Then** exactly one Certificate row is inserted for my Enrollment — a persisted one-time write, never recomputed live on each view

**Given** two devices of mine both finish my last required Lesson at nearly the same moment
**When** both requests race to trigger completion
**Then** the database's unique constraint on `Certificate(enrollmentId)` with an atomic insert-if-not-exists path ensures exactly one Certificate is issued, not two

**Given** my Certificate has been issued
**When** I download it
**Then** it includes my Learner name, the Course title, the Instructor name, and the completion date, rendered via a real browser engine (Playwright) so bilingual/RTL text (including Arabic names/titles) shapes correctly

**Given** my Certificate has been issued
**When** the Instructor later renames the Course, or I later change my display name
**Then** my already-issued Certificate keeps showing the name/title as they were at issuance — content is a frozen snapshot copied onto the Certificate row, never re-derived live from current Account/Course data (Architecture AD-7)

**Given** I already hold a Certificate for this course
**When** the Instructor later adds new Lessons to the course (Epic 2, FR-15)
**Then** my Certificate is not retroactively revoked, and the new Lessons are not required for me

**Given** I have just completed the course
**When** I view Course Home
**Then** the certificate-ready state and download action surface immediately — not on my next login

### Story 5.2: Post-Completion Rating & Review

As a Learner who has completed a course,
I want to leave a star rating and an optional written review,
So that I can tell the next learner whether it was worth their time.

**Acceptance Criteria:**

**Given** I have just completed a course
**When** completion is detected
**Then** I am prompted immediately to rate/review it — completion is a moment, not a silent checkmark

**Given** I am enrolled in a course
**When** I submit a 1–5 star Rating with an optional written Review
**Then** it is saved once per (my account, this course) — the database enforces this uniqueness, not just the application

**Given** I am not enrolled in a course
**When** I attempt to submit a Rating
**Then** I am blocked — Enrollment is required to rate, via the same `canQueryCourse()`/access family of checks used elsewhere

**Given** I have already rated this course
**When** I revisit the rating prompt or form
**Then** I see my existing rating/review in an editable state, not the initial prompt again

### Story 5.3: Aggregate Rating Display

As a visitor or Learner,
I want to see a course's aggregate rating and individual reviews,
So that I can judge whether a course is worth my time before or after enrolling.

**Acceptance Criteria:**

**Given** a course has one or more Ratings
**When** I view its Course detail page
**Then** I see the aggregate rating (e.g. average stars) and the individual written Reviews

**Given** a course has zero Ratings yet
**When** I view its Course detail page
**Then** the ratings section reflects that clearly, not a broken or blank widget

**Given** the Admin later removes a Rating via moderation (Epic 7)
**When** the aggregate is recalculated
**Then** the removed Rating no longer contributes to the aggregate or the visible review list

## Epic 6: Discussion

A signed-in Learner can post and read comments on a course or lesson, giving them a way to ask questions without a separate support channel.

### Story 6.1: Comment Threads on Courses and Lessons

As a signed-in Learner,
I want to post and read comments on a course or a specific lesson,
So that I can ask questions and see what other learners and the instructor have said.

**Acceptance Criteria:**

**Given** I am signed in
**When** I post a Comment on a Course or on a specific Lesson
**Then** it is saved and attached to that Course or Lesson

**Given** a Course or Lesson has Comments
**When** I, as an enrolled Learner or the Course's Instructor, view it
**Then** I see all its Comments in flat chronological order — no nested replies, new comments append to the bottom, no pinning

**Given** I am not enrolled in the course and am not its Instructor
**When** I view the Course or Lesson
**Then** I cannot see or post Comments there — visibility follows the same enrollment-gated access family as Lesson content

**Given** a Course or Lesson has no Comments yet
**When** I view it
**Then** I see "No comments yet — ask the first question," not a blank section

**Given** the Admin later removes a Comment via moderation (Epic 7)
**When** I, as the Comment's author, view the thread
**Then** my Comment has disappeared, visible to me that it was removed

## Epic 7: Admin Moderation

Ahmed, the Admin, can view and remove any comment, rating/review, or course, with removal visible to the content's author.

### Story 7.1: Admin Moderation Console

As the Admin,
I want to view and remove any Comment, Rating/Review, or Course,
So that I can keep the platform clean without needing an automated flagging system.

**Acceptance Criteria:**

**Given** I am signed in as the Admin
**When** I open the moderation console
**Then** I can browse Comments, Ratings/Reviews, and Courses across the platform (manual pull, not an auto-populated flagged queue)

**Given** I select a Comment, Rating/Review, or Course
**When** I remove it
**Then** it is soft-deleted (a `removedAt`/status flag) — never a hard delete — by the same soft-delete path used everywhere else in the system (AD-11), so Enrollment/Progress/Certificate rows tied to a removed Course are never orphaned

**Given** I remove a Learner's Comment or Rating/Review
**When** that Learner views their own content
**Then** it has disappeared from their view — removal is visible to the author, without any reporting/flagging UI being required

**Given** I am signed in as a Learner or Instructor (not Admin)
**When** I attempt to reach the moderation console
**Then** I am blocked from it

**Given** there is nothing flagged or pending
**When** I open the moderation console
**Then** I see a neutral empty state — moderation is a manual pull, not a queue implying a backlog
