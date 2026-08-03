---
id: SPEC-sanabel
companions:
  - glossary.md
  - ../../planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md
  - ../../planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/SOLUTION-DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-BMAD Test-2026-08-02/DESIGN.md
  - ../../planning-artifacts/ux-designs/ux-BMAD Test-2026-08-02/EXPERIENCE.md
sources:
  - ../../planning-artifacts/briefs/brief-BMAD Test-2026-07-30/brief.md
  - ../../planning-artifacts/prds/prd-BMAD Test-2026-07-30/prd.md
  - ../../planning-artifacts/prds/prd-BMAD Test-2026-07-30/addendum.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# SPEC: Sanabel

## Why

Sanabel is a vision to realize: Ahmed's personal, non-commercial conviction that learning to code should be free, permanently — no paywall, no tiered access, no ads, no monetization pressure. It exists to give instructors a place to share coding knowledge without a platform taking a cut, and to give any signed-in learner full access to structured courses (not scattered free videos) with progress tracking, certificates, discussion, and ratings built in from day one. v1 targets a real, if modest, public launch starting with friends and community — the bar is that it works for two named people: Yousef, an instructor turning his SQL knowledge into a course, and Lina, a learner who finds it through a friend and finishes it.

## Capabilities

- **CAP-1 — Accounts & Authentication**
  - **intent:** Any visitor can sign up and sign in via email/password or Google/GitHub social login, and hold Learner/Instructor/Admin role flags on one account; Instructor status is granted only by the Admin, with no self-service application flow.
  - **success:** A new signup verifies email before merging with a social login on the same address; a social login and a verified email/password account on the same email are treated as one user; an account without the Instructor grant never sees "Create a course" or any authoring surface, anywhere in the product, even hidden.

- **CAP-2 — Course Authoring**
  - **intent:** An Instructor can build a Course from a minimal start (title, one-line description, Category) into a nested Module → Lesson outline with drag-reorder, author each Lesson as exactly one of five Lesson Types (Video, Text, PDF, Quiz, Interactive Code Exercise), work with continuous autosave and explicit upload status, preview the course exactly as a Learner would (including mobile) before publishing with a required visibility (Public/Unlisted) and Category, keep editing after publish without disrupting enrolled Learners, and view per-Lesson engagement analytics.
  - **success:** Yousef (UJ-1) goes from an empty "My Courses" dashboard to a published Unlisted course containing multiple modules and all five Lesson Types, without an explicit save step and without losing work on a crashed tab, then opens analytics and sees a view count and completion count per Lesson.

- **CAP-3 — Course Discovery**
  - **intent:** Any visitor, signed in or not, can browse and search Public Courses by Category, and view a Course's detail page — title, instructor name/bio, preview, full Module/Lesson outline (titles only), aggregate rating and reviews — without signing in; a signed-in Learner can enroll in any Public or Unlisted Course they can reach, at no cost.
  - **success:** Lina (UJ-2) arrives at a Course detail page via a shared link, decides it's worth her time without signing in, clicks Enroll, completes a lightweight signup, and is enrolled — with Enrollment the only gate between the detail page and Lesson content (no payment, no approval step). Unlisted Courses never appear in browse/search results.

- **CAP-4 — Learning Experience**
  - **intent:** An enrolled Learner sees an overall progress bar and per-Lesson completion checkmarks, always resumes at the exact last incomplete Lesson via "Continue" from any device or session, and receives immediate graded feedback — with an explanatory hint on failure — on Quizzes and Interactive Code Exercises; Video Lessons support playback speed control and resume-from-last-position.
  - **success:** A Learner who abandons mid-course and returns weeks later resumes exactly where they left off with no re-onboarding; a wrong quiz or code-exercise answer returns an explanatory message (e.g. "Almost — you forgot the WHERE clause"), never a bare "Incorrect."

- **CAP-5 — Certificates**
  - **intent:** On completing all required Lessons, Quizzes, and Interactive Code Exercises in a Course, a Learner receives a downloadable Certificate (Learner name, Course title, Instructor name, completion date) and is prompted to rate the Course.
  - **success:** Completion produces a Certificate download and a rating prompt in the same session, not on next login; a Certificate already issued is not retroactively revoked when the Instructor later adds required Lessons to that Course.

- **CAP-6 — Discussion**
  - **intent:** A signed-in Learner can post a Comment on a Course or on a specific Lesson; Comments are visible to any enrolled Learner and the Course's Instructor, in flat chronological order.
  - **success:** An enrolled Learner posts a Comment on a Lesson and it is visible to other enrolled Learners and the Instructor in posting order, with no threading.

- **CAP-7 — Ratings & Reviews**
  - **intent:** A Learner enrolled in a Course can leave a 1–5 star Rating with an optional written Review, once per Course; the Course detail page displays the aggregate Rating and individual Reviews.
  - **success:** A Learner submits exactly one Rating/Review per Course, visible aggregated on the detail page; attempting to rate again shows their existing Rating in an editable state rather than creating a duplicate.

- **CAP-8 — Moderation**
  - **intent:** The Admin can view and remove (soft-delete) any Comment, Rating/Review, or Course.
  - **success:** The Admin removes a Comment; it disappears from other users' view while its author sees it as removed; no automated flagging/reporting UI is required for this to work.

- **CAP-9 — Internationalization**
  - **intent:** All platform UI (navigation, buttons, system messages, account flows) is available in English and Arabic with correct right-to-left layout when Arabic is active, switchable without losing in-progress state or requiring re-login; Course content itself is authored by the Instructor in whichever language they choose, with no auto-translation.
  - **success:** Switching language mid-edit in the course builder preserves the unsaved form; RTL renders correctly across the outline editor, video player controls, and progress bar; code blocks and the code-exercise console stay left-to-right and monospace regardless of active language.

## Constraints

- No paid courses, ever, and no advertising, ever — permanent product principles, not v1 scoping choices. Zero pricing/paid-access surface may exist anywhere in the product at any time (standing invariant, not a one-time milestone).
- Interactive Code Exercise submissions must run in a sandboxed environment with enforced CPU/memory/time limits and no network egress — a launch-blocking security requirement given real public traffic at launch, not a hardening pass added later.
- Video/PDF uploads are capped per Lesson and per Instructor to bound Cloudflare Stream cost exposure (there is no revenue to offset it); an upload exceeding the cap is rejected at upload time, never silently truncated or accepted-then-billed.
- Bilingual English/Arabic with full RTL is a first-class requirement across every UI surface — including course-builder outline, video player, progress bar, transactional email, and certificate rendering — not a locale bolt-on. Code blocks and the code-exercise console always stay LTR and monospace regardless of page direction.
- Moderation is manual-only (Admin/Ahmed) in v1 — no automated filtering or community flagging; this is accepted as unable to scale past a small userbase.
- Modular monolith: one Next.js app over one Postgres database; every table has exactly one owning module, and cross-module access goes only through that module's exported service layer, never a raw query against another module's schema. Full module ownership map, dependency graph, and per-module contracts (AD-1 through AD-13) are the enforceable rules in the adopted `ARCHITECTURE-SPINE.md` companion.
- Soft-delete only, never hard delete, for a Course, Module, Lesson, Comment, or Rating — by any actor, through any surface — so Enrollment/Progress/Certificate rows are never orphaned.
- Certificate issuance is a persisted one-time write, unique per Enrollment (database-enforced), never recomputed live — this is what makes "an already-issued Certificate survives later Course changes" hold structurally.
- The database enforces uniqueness, not just application code: one Enrollment per (account, course), one Rating per (account, course), one Certificate per Enrollment.
- Cloudflare Stream spend-per-active-learner must not grow unbounded as a side effect of chasing enrollment growth; course/instructor-signup quantity must not be optimized at the expense of course quality.

## Non-goals

- No paid courses, no pricing tiers, no premium Course — permanent, not a v1 scoping choice.
- No advertising.
- No mobile app in v1 — web only, responsive; a native/PWA experience is a possible later phase, not committed.
- No donation/payment feature in v1 — a possible later addition, explicitly never a gate on access.
- No automated content moderation in v1 — manual admin review only.
- No pre-publish content review queue in v1 — Instructors self-publish; Unlisted visibility is the only pre-public-listing gate.
- No certificate verification portal in v1 — Certificates are downloadable files with no public lookup mechanism.
- No content auto-translation — bilingual scope covers platform UI, not machine-translating Instructor content.
- No topics outside software/coding — Category scope stays fixed to coding education.

## Success signal

Ahmed creates and publishes one full multi-lesson Course end-to-end without external help, and at least one Learner outside Ahmed signs in, discovers that Course, completes it, and receives a Certificate. Together these demonstrate the brief's own bar for v1 success: it exists and it works — not revenue, not scale.

## Assumptions

- FR-11 upload caps (draft: 60 min video/Lesson, 20 hrs stored video/Instructor/month) are not yet confirmed by Ahmed; the architecture's cost review also found the addendum's Cloudflare Stream pricing figures reversed (actual ~$1/1,000 min stored + $5/1,000 min delivered, not $5/$1 as the addendum states) — real cap math needs a correction pass before these values are finalized.
- The Course detail page (browse listing, full outline titles, instructor bio, ratings) is visible pre-signup; only Lesson content requires Enrollment — a deliberate narrowing of the brief's literal "sign-in required to view any course" line, driven by Lina's pre-commit decision moment in UJ-2.
- Comments are flat/chronological, not threaded — no nested-reply data model in v1.
- Bilingual EN/AR + full RTL v1 scope is inferred from the product name Sanabel's Arabic etymology, not a regional audience confirmed directly by Ahmed; the brief itself left "who this serves (region/community)" open. Accepted as-is into the finalized PRD.
- Quizzes were the brief's own speculative future-Vision idea ("richer lesson interactivity"), pulled forward into committed v1 scope by the PRD; Interactive Code Exercises exceed the brief's original video/text/PDF/other lesson-format scope entirely. Both are accepted in the finalized PRD as deliberate, self-flagged scope calls, not silent creep.
- No formal accessibility (WCAG) compliance mandate applies to v1 — the PRD treats it as aspirational; the UX spec nonetheless sets a concrete practical floor (keyboard operability, screen-reader semantics, focus states, live-region status announcements) above that framing, built in from day one, not retrofitted.
- No formal GDPR/regional compliance program is in scope for v1 — standard reasonable-care data handling applies; no account-deletion or data-export capability is committed (see Open Questions).
- The per-Lesson certificate-eligibility "required" toggle defaults to true — an Instructor opts a Lesson *out* of certificate eligibility rather than opting each Lesson in.
- `Course.contentLanguage` (`en`/`ar`, one free-text field per Course, no per-locale columns) was adopted by the architecture to resolve the PRD's own open question about per-Course language — the UX spec's "Taught in: Arabic/English" course-card badge already presupposed this field existing.

## Open Questions

- Should a lightweight pre-publish review queue exist for Public Courses as volume grows, or does Unlisted-during-buildout plus no gate on Public stay sufficient?
- Should Certificates move to a verifiable public-ID model before learners start citing them to employers? (Certificate rows should stay ID-structured now so this stays cheap to retrofit later.)
- What upload caps (size, video duration, or monthly volume) should actually bound Cloudflare Stream cost, given the addendum's cost figures were found reversed during architecture review (see Assumptions)?
- Should quiz/exercise "required" status be settable per-Lesson beyond the current opt-out default, so some Lessons can be marked supplementary/non-blocking for Certificate eligibility?
- Should Sanabel provide captions/transcripts for Video Lessons beyond Cloudflare Stream's built-in auto-captions?
- Should learners be able to delete their account and export their data in v1?
- Should signup and Comment posting have bot/abuse controls (CAPTCHA, rate limiting), given manual-only moderation assumes human-paced volume?
- How should Interactive Code Exercises actually be authored beyond the SQL v1 scope — what languages, how does an Instructor define grading logic/expected output, what dataset formats/size limits apply?
- What does Browse/Search show when there are few or zero Public Courses, given Instructor growth is entirely admin-gated and could plausibly launch thin?
