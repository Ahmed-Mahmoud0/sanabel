---
name: Sanabel
status: final
sources:
  - {planning_artifacts}/prds/prd-BMAD Test-2026-07-30/prd.md
  - {planning_artifacts}/briefs/brief-BMAD Test-2026-07-30/brief.md
updated: 2026-08-02
---

# Sanabel — Experience Spine

## Foundation

Sanabel is a responsive web application, v1 — no native mobile app (confirmed non-goal). `[ASSUMPTION]` The UI system is React + Tailwind, loosely informed by shadcn/ui defaults, with full light/dark mode; `DESIGN.md` is the visual identity source for every token and component referenced below. Mobile-web rendering is not optional: FR-13 requires the Instructor's "preview as learner" mode to show the course exactly as it will render on mobile, so every learner-facing surface is designed and verified mobile-first.

Three roles share one account model (FR-3): **Learner** (default, every account), **Instructor** (Admin-granted, adds course-authoring surfaces), **Admin** (Ahmed only, adds moderation). Navigation is role-gated — a Learner without the Instructor grant never sees "Create a course" or the authoring dashboard anywhere in the product, not even a disabled/greyed version of it (FR-3's consequence). Bilingual English/Arabic with full RTL is a first-class v1 requirement (FR-33), not a locale bolt-on: every flow below must work identically in both directions, and switching language mid-flow preserves in-progress state (an open course-builder form, an in-progress quiz) rather than resetting it.

## Information Architecture

| Surface | Reached from | Purpose | FRs |
|---|---|---|---|
| Sign up / Sign in | Header "Sign in," or any gated action (Enroll, Create a course) | Email/password or Google/GitHub social login | FR-1, FR-2 |
| My Courses (Instructor dashboard) | Instructor-only nav item | List of the Instructor's courses; entry point for "Create a course" | FR-3, FR-6 |
| Course outline editor | My Courses → a course | Nested Modules → Lessons outline; drag-reorder; autosaves continuously | FR-7, FR-8, FR-12 |
| Lesson authoring (per type) | Outline editor → a lesson row | One editor per Lesson Type: Video upload, Text (rich text + syntax-highlighted code blocks), PDF upload, Quiz builder, Code Exercise builder | FR-9 |
| Upload status | Video/PDF lesson editor | Queued / processing / ready / failed, with retry on failure, always visible | FR-10, FR-11 |
| Learner-preview mode | Outline editor toolbar toggle | Renders the course exactly as a Learner sees it, including mobile | FR-13 |
| Publish flow | Outline editor → Publish | Sets visibility (Public/Unlisted) and required Category; no pricing step exists anywhere in this flow | FR-14, FR-15 |
| Instructor analytics | My Courses → a course → Analytics | Per-lesson view count and completion count | FR-16 |
| Browse / Search | Public nav "Browse" | Search + Category filter + course-language filter over Public courses | FR-17, FR-34 |
| Public course detail page | Browse result, direct link, or shared link | Title, instructor bio, preview, full outline (titles only), aggregate rating + reviews — visible pre-signup | FR-18 |
| Enrollment | Course detail page "Enroll" | Signed-in Learner joins a course at no cost; prompts signup first if not signed in | FR-19 |
| Course home | Post-enroll redirect, or "My Learning" nav | Module list, overall progress bar, per-lesson checkmarks, "Continue" control | FR-20, FR-21, FR-25 |
| Video player | Video lesson | Playback speed control, resume-from-last-position, caption toggle | FR-22 |
| Quiz-taking | Quiz lesson | Multiple-choice, auto-graded, immediate feedback | FR-24 |
| Code-exercise console | Code Exercise lesson | Embedded editor, Run/Check, pass/fail feedback with hint on failure | FR-23 |
| Certificate download | Course home on completion, or completion modal | Downloadable file: learner name, course title, instructor name, completion date | FR-26 |
| Rating & review | Post-completion prompt, and visible on course detail page | 1–5 stars + optional written review, once per course | FR-27, FR-30, FR-31 |
| Comments | Course page and individual lesson pages | Flat, chronological, visible to enrolled learners + the instructor | FR-28, FR-29 |
| Admin moderation console | Admin-only nav | View/remove any Comment, Rating/Review, or Course | FR-32 |
| Language switcher | Global header, every surface | Switches EN ⇄ AR without losing in-progress state | FR-33 |

Visual reference: [mockups/key-course-home.html](mockups/key-course-home.html) (in-progress and just-completed states, EN/AR) and [mockups/key-outline-editor.html](mockups/key-outline-editor.html) (mid-drag and upload-processing/failed states, EN/AR) — spine tables above remain the contract; mocks illustrate.

## Voice and Tone

Microcopy patterns. Brand voice and visual posture live in `DESIGN.md`.

| Do | Don't |
|---|---|
| "Processing your video — this can take a few minutes." | Leaving the upload status blank while it processes |
| "Upload failed. Retry?" | A dead-end error with no next action |
| "2 of 14 lessons complete" | "In progress" with no number |
| "You did it. Download your certificate." | A silent checkmark with no acknowledgment |
| "Almost — you forgot the WHERE clause." | "Incorrect." with no explanation |
| "No courses here yet — be the first to create one." | "No results found." on an empty Browse page |
| "Saved." (text only, cycling from "Saving…") | A modal or toast interrupting the authoring flow for every autosave |
| Same tone, same directness, in Arabic and English | A more casual English voice paired with a more formal Arabic translation |

Two rules carried directly from the PRD: momentum never goes silent (a processing upload, a submitted quiz, a running code exercise always show *something* happening), and completion is a moment, not a checkmark — the certificate and the rating prompt are the payoff, not administrative follow-up.

## Component Patterns

Behavioral rules. Visual specs live in `DESIGN.md.Components`. `Button`, `Card`, and `Input` inherit standard shadcn interaction behavior (click/focus/disabled states) and get no bespoke row here — only components with Sanabel-specific behavior do.

| Component | Use | Behavioral rules |
|---|---|---|
| Autosave | Course outline, lesson content, ordering | No save button anywhere in the builder. Saves on pause (~600–800ms after the last edit). Header cycles "Editing…" → "Saved." Closing or crashing the tab never loses the last autosaved state (FR-12). |
| Drag-reorder outline | Modules and Lessons in the outline editor | Reorder without opening the item. Every drag action has a keyboard equivalent (see Accessibility Floor) — drag is a convenience, not the only path. |
| Upload with retry | Video/PDF lesson editor | Status is always visible (queued/processing/ready/failed), never inferred from silence. Failed state shows a Retry action inline, no re-upload-from-scratch required. |
| Progress bar (`{components.progress-bar}`) | Course home, course card | Dual display: overall percentage bar (course home) and per-lesson checkmarks (outline) always agree — completing a lesson updates both simultaneously. The same fill also appears on an enrolled course's course-card in "My Learning." |
| Course card (`{components.course-card}`) | Browse grid, course home "My Learning" grid | Click anywhere on the card opens the course detail page (Browse) or resumes into course home (My Learning, if enrolled). Shows title, instructor, language badge always; progress bar only when enrolled. |
| Code editor (`{components.code-editor}`) | Code Exercise lesson (author + take) | `[ASSUMPTION]` Monaco-style editor. Learner writes code, hits Run/Check, gets pass/fail with an explanatory hint on failure (never bare "Incorrect"). Instructor's authoring view is the same editor pre-loaded with starter code and expected-output configuration. |
| Video player chrome (`{components.video-player-chrome}`) | Video lesson | Speed control and resume-from-last-position always available (FR-22). Caption toggle `[ASSUMPTION]` off by default, one tap to enable, surfacing Cloudflare Stream's auto-captions; an instructor-corrected transcript can replace them later without blocking playback in the meantime. |
| Certificate-required toggle | Lesson settings (Instructor) | `[ASSUMPTION]` Per-lesson toggle, defaults to required = true. Instructor opts a lesson *out* of certificate eligibility rather than opting each lesson in. |
| Badge (`{components.badge}`) | Course creation form, course card, Browse filter, role tags | `[ASSUMPTION]` Course-language badge is single-select "Taught in: Arabic / English," set at course creation, shown on every course card, and usable as a Browse filter. Role tags (Instructor/Admin) and category tags reuse the same component, display-only. |
| Language toggle (`{components.language-toggle}`) | Global header, every surface | Switches EN ⇄ AR without a page reload that would drop in-progress state (FR-33). See also Interaction Primitives. |
| Comment thread | Course page, lesson page | Flat, chronological, no nested replies (FR-29's confirmed scope). New comments append to the bottom; no pinning. |

## State Patterns

| Surface | State | Treatment |
|---|---|---|
| Browse | Cold start, zero Public courses | `[ASSUMPTION]` Inviting empty state pointing prospective Instructors to create the first course — never a blank grid or generic "no results." |
| Browse | Search / filter, no matches | "No courses match — try a different category or language." Filters stay visible and adjustable. |
| My Courses (Instructor) | Cold start, zero courses | "Create your first course." Single primary action, no empty grid — this is Yousef's very first screen in UJ-1. |
| Sign up | Duplicate email | Clear rejection message naming the conflict, with a link into sign-in instead (FR-1's consequence). |
| Course outline editor | Initial load | Skeleton rows matching the expected Module/Lesson shape, resolves on data. |
| Video/PDF lesson | Upload processing | Explicit "processing" status, never silent (FR-10). |
| Video/PDF lesson | Upload failed | Clear failed state + Retry action, never a silent, ambiguous "still processing" (UJ-1's named edge case). |
| Code editor | Run submitted | Loading indicator on the Run button while grading executes; then pass (`{colors.success}`) or fail (`{colors.error}`) with a hint. |
| Quiz | Submitted | Immediate per-question or per-quiz feedback; no "results pending" state — grading is synchronous (FR-24). |
| Course home | Learner returns after weeks away | "Continue" resumes at the exact last incomplete lesson — no re-onboarding, no lost state (UJ-2's named edge case). |
| Course home | Just completed | Certificate-ready state + rating/review prompt surfaces immediately, not on next login (FR-26, FR-27). |
| Course detail page | Already enrolled | "Enroll" becomes "Continue" — no duplicate-enrollment dead end. |
| Rating & review | Already rated | Shows the Learner's existing rating/review in an editable state rather than the prompt again — once per course (FR-30). |
| Instructor analytics | No data yet | "No views yet — check back once learners find this course." Never an empty chart with no explanation. |
| Comments | No comments yet | "No comments yet — ask the first question." |
| Publish flow | Publishing an already-live course with new content | New Modules/Lessons appear in enrolled learners' outlines automatically; already-issued certificates are not revoked (FR-15). |
| Admin moderation | Nothing flagged | Neutral empty state — moderation is manual pull, not a queue that implies a backlog. |
| Any authenticated surface | Language switch mid-task | In-progress state (partially filled course-builder form, an in-progress quiz attempt) is preserved across the switch — never a reset or forced re-login (FR-33's consequence). |

## Interaction Primitives

- **Drag-and-drop** — outline reordering (Modules, Lessons). RTL-aware: drag direction and drop-indicator placement mirror when Arabic is active, matching the logical (start/end) layout from `DESIGN.md`. Keyboard equivalent required — see Accessibility Floor.
- **RTL-aware gestures/controls** — video scrubber, progress bar, and outline drag handles all mirror their interaction direction under RTL; the code editor and any numeral display (timestamps, counts) do not mirror and stay LTR per `DESIGN.md`.
- **Language switch** — a single global control (header, every surface). Switching re-renders the UI chrome in the new language/direction without a page reload that would drop unsaved form state, and without requiring the user to sign in again (FR-33).
- **Upload retry** — a single tap/click on the failed state's Retry action re-attempts the same upload without requiring the file to be re-selected, where the browser/API allows it.
- **Run/Check (code exercise)** — explicit action, not auto-run-on-keystroke; grading happens server-side in a sandboxed environment, so the primitive is submit → wait (visible) → result, never instant/local execution that could be spoofed.

## Accessibility Floor

`[ASSUMPTION]` Sanabel sets a concrete practical floor above the PRD's "aspirational" framing — full keyboard operability, semantic landmarks, and visible focus states are built in from day one, not retrofitted. (Color-contrast targets are `DESIGN.md`'s responsibility, not this file's.)

- Every drag-and-drop interaction (outline reorder) has a keyboard equivalent: focus a row, use an explicit "move up / move down" control or arrow-key reordering with an audible/visible confirmation of the new position.
- Focus order follows logical reading order in both languages — left-to-right in English, right-to-left in Arabic — not DOM order that happens to look right in one direction only.
- Every interactive element carries a role + accessible name; bilingual content is marked with the correct `lang` attribute per text run so screen readers switch voice/pronunciation correctly mid-page (e.g., an Arabic course title next to an English UI label).
- Live-region announcements: autosave status ("Saved.") and upload status changes (queued → processing → ready/failed) are announced via `aria-live`, not conveyed by visual state alone — this matters most for an Instructor who has tabbed away from the upload panel mid-processing.
- All interactive targets meet a minimum touch/click target size consistent with the mobile-first rendering requirement (FR-13).
- Video player controls (play/pause, speed, captions, scrubber) are fully keyboard-operable and expose their state (e.g., "captions: on") to assistive tech.

## Key Flows

### UJ-1: Yousef's course authoring

1. Yousef, granted Instructor status by Ahmed (FR-4), signs in and lands on an empty My Courses dashboard.
2. Clicks "Create a course." The first screen asks only for title, one-line description, and Category — no syllabus, objectives, or pricing gate (FR-6).
3. Lands in the outline editor and brain-dumps lesson titles across a "Getting Your Data" module, before writing any actual content (FR-7).
4. Drag-reorders lessons directly in the outline without opening each one (FR-8).
5. Opens "What is a SELECT statement?" and authors it: uploads a video (sees a processing status, never silence), writes a text lesson with syntax-highlighted SQL code blocks, adds a 3-question auto-graded quiz, and builds an interactive query-console exercise against a sample dataset (FR-9, FR-10).
6. Works without ever hitting a save button — the outline and every lesson autosave continuously; closing the tab mid-edit loses nothing (FR-12).
7. Before publishing, toggles "preview as learner" and checks the course renders correctly, including on mobile (FR-13).
8. **Climax:** Hits Publish — sets visibility to Unlisted (two more modules still to go) and assigns the SQL category. No pricing option is ever presented (FR-14). The outline that was empty an hour ago is now a real, shareable course.
9. Resolution: the course exists, unlisted, shareable selectively while Yousef finishes the remaining modules; once he has a first cohort, he opens lesson-level analytics to see where learners drop off (FR-16).

Failure path: if a video upload fails processing, the lesson shows a clear failed state with a Retry action — never a silent, ambiguous "still processing" (see State Patterns).

### UJ-2: Lina's discovery-to-completion

1. Lina, not signed in, arrives at a course detail page via a link a friend shared on WhatsApp.
2. Sees enough to decide without signing in first: title, instructor name/bio, a preview video, the full module/lesson outline, and existing ratings (FR-17, FR-18).
3. Clicks "Enroll," which prompts a lightweight signup — email/password or social login (FR-1, FR-2, FR-19).
4. Lands on course home: modules listed, a progress bar ("2 of 14 lessons complete"), and a "Continue" button that will always resume exactly where she left off (FR-20, FR-21).
5. Works through a video lesson (speed control, resume-mid-video), a syntax-highlighted text lesson, and the interactive SQL exercise — gets immediate feedback ("Almost — you forgot the WHERE clause") on a wrong answer, retries, passes (FR-22, FR-23).
6. Tracks progress two ways as she goes — an overall percentage bar and per-lesson checkmarks in the outline — so she can jump back to review without losing forward progress (FR-25).
7. Passes the final quiz (FR-24).
8. **Climax:** Completion isn't a quiet checkmark — Lina gets a downloadable certificate and a prompt to rate the course (FR-26, FR-27). That moment is what turns her into someone who shares the course with the next friend, the same way she found it.
9. Resolution: course completed, certificate in hand, rating left, progress preserved permanently against her account.

Failure path: if Lina abandons mid-course and returns weeks later, "Continue" still resumes at the exact last uncompleted lesson — no re-onboarding, no lost state (see State Patterns).
