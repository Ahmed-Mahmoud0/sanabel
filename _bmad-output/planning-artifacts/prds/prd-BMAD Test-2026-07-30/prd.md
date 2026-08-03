---
title: PRD: Sanabel
status: final
created: 2026-07-30
updated: 2026-07-30
---

# PRD: Sanabel

## 0. Document Purpose

This PRD is for Ahmed as builder and, downstream, for whoever picks up UX and architecture work on Sanabel. It builds on the finalized [Product Brief: Sanabel](../../briefs/brief-BMAD%20Test-2026-07-30/brief.md) rather than repeating it — read that first for the "why." Features here are grouped by capability, each with globally-numbered Functional Requirements (FR-1 through FR-34) that stay stable even if sections get reorganized later. Terms used throughout are defined once in the Glossary (§3) and used verbatim everywhere else. Inline `[ASSUMPTION: ...]` tags mark places this PRD inferred without a direct confirmation from Ahmed; all of them are indexed in §11 for explicit review. A companion [addendum.md](addendum.md) holds research grounding and rejected-alternative rationale that informed decisions below (video hosting, certificate verification, moderation approach) without cluttering this narrative.

## 1. Vision

Sanabel is a free, ad-free, permanently-free online platform for learning to code. Instructors upload courses built from lessons in whatever format suits the material — video, text, PDF, quizzes, or hands-on interactive exercises — and any signed-in learner gets full access at no cost, with no tiered plans and no paywall standing between them and the content. Progress tracking, certificates, discussion, and ratings are built in from day one, not bolted on later.

The product's edge isn't a technical moat — Udemy, Coursera, Khan Academy, and freeCodeCamp already do free-forever coding education well. Sanabel's edge is posture: it exists purely to keep the gate open, permanently, because Ahmed controls the mission and doesn't need to monetize it. Donations may show up later as an optional way to support instructors, but access itself is never for sale.

v1 is scoped for a real, if modest, public launch — starting with friends and community rather than broad marketing — with enough rigor that the platform holds up under real learners rather than just a demo. The first two people it has to work for are Yousef, an instructor turning his SQL knowledge into a structured course, and Lina, a learner who finds that course through a friend and finishes it.

## 2. Target User

### 2.1 Jobs To Be Done

**Instructors**
- Turn knowledge I already have into a structured course without a platform taking a cut or gating my content behind pricing tiers I don't control.
- Get my course live with low friction — start from an idea, not a form.
- Know whether learners are actually getting through my course, so I can improve it.

**Learners**
- Learn to code with structured, sequenced material instead of scattered free videos.
- Get in and see what a course actually covers before committing to sign up for it.
- Never lose my place — pick up exactly where I left off.
- Walk away with something to show for finishing (a certificate) and a way to say a course was worth it (rating/review).

### 2.2 Non-Users (v1)

- Learners looking for topics outside software/coding — Sanabel's categories are scoped to coding education only.
- Mobile-first users expecting a native app — v1 is web only.
- Instructors expecting to charge for their course — Sanabel has no paid-course mechanism, by design, in any version.

### 2.3 Key User Journeys

- **UJ-1. Yousef builds and publishes a beginner SQL course.**
  - **Persona + context:** Yousef, a mid-career SQL/data analyst, wants to turn his knowledge into a structured beginner course without wrestling with a heavyweight course-builder first.
  - **Entry state:** Signed in; Ahmed has already granted his account Instructor status (FR-4). Lands on an empty "My Courses" dashboard, no prior courses.
  - **Flow:**
    1. Clicks "Create a course." First screen asks only for title, one-line description, and category — no syllabus, objectives, or pricing gate. (FR-6)
    2. Lands in an outline view (Modules → Lessons) and brain-dumps lesson titles across a "Getting Your Data" module before writing any actual content. (FR-7)
    3. Drag-reorders lessons directly in the outline without opening each one. (FR-8)
    4. Opens "What is a SELECT statement?" and picks a lesson type per piece of content: uploads a Loom-recorded video (sees a processing progress indicator, not silence); writes a text lesson with syntax-highlighted SQL code blocks; adds a 3-question auto-graded quiz; builds an interactive query console exercise where learners write real SQL against a sample dataset and get pass/fail feedback. (FR-9, FR-10)
    5. Course builder autosaves as he works — no explicit save step, no risk from a crashed tab. (FR-12)
    6. Before publishing, toggles "preview as learner" to see the course rendered exactly as students will, including on mobile. (FR-13)
    7. Publishes: sets visibility to Unlisted (two more modules to go) and assigns the SQL category. (FR-14)
    8. After a first cohort of learners, opens lesson-level analytics to see where they're dropping off. (FR-16)
  - **Climax:** The moment the outline fills with lesson titles across modules and Yousef sees the whole course take shape before he's written a word of actual content — that's when it stops feeling like a form and starts feeling like a course.
  - **Resolution:** Course exists, unlisted, ready to share selectively while Yousef finishes the remaining modules.
  - **Edge case:** If a video upload fails processing, the lesson shows a clear failed state with a retry action — never a silent, ambiguous "still processing."
  - **Capability → FR mapping:** low-friction course creation → FR-6; outline-first structuring → FR-7, FR-8; multi-format lesson authoring → FR-9; upload status visibility → FR-10; autosave → FR-12; learner-accurate preview → FR-13; visibility + categorization on publish → FR-14; post-publish analytics → FR-16.

- **UJ-2. Lina finds a course through a friend and finishes it.**
  - **Persona + context:** Lina, a university student, wants basic SQL for an internship. A friend shares a course link over WhatsApp — she arrives via direct link, not homepage browsing.
  - **Entry state:** Not signed in, arriving at a course detail page from an external link.
  - **Flow:**
    1. Sees the course detail page without signing in first: title, instructor name/bio, a preview video, the full module/lesson outline, and existing ratings — enough to decide if it's worth her time before committing. (FR-17, FR-18)
    2. Clicks "Enroll," which prompts a lightweight signup (email/password or social login). (FR-1, FR-2, FR-19)
    3. Lands on the course home screen: modules listed, a progress bar ("2 of 14 lessons complete"), and a "Continue" button that resumes exactly where she left off, every session. (FR-20, FR-21)
    4. Works through video (with speed control and resume-mid-video), a syntax-highlighted text lesson, and the interactive SQL exercise — gets immediate feedback ("Almost — you forgot the WHERE clause") on a wrong answer, retries, passes. (FR-22, FR-23)
    5. Tracks progress two ways as she goes: an overall percentage bar and per-lesson checkmarks in the outline, so she can jump back to review without losing forward progress. (FR-25)
    6. Passes the final quiz. (FR-24)
  - **Climax:** Completion isn't a quiet checkmark — it's a certificate she can download, plus a prompt to rate the course. That's the moment that turns her into someone who shares the course with the next friend, the same way she found it. (FR-26, FR-27)
  - **Resolution:** Course completed, certificate in hand, rating left, progress preserved permanently against her account.
  - **Edge case:** If she abandons mid-course and returns weeks later, "Continue" still resumes at the exact last uncompleted lesson — no re-onboarding, no lost state.
  - **Capability → FR mapping:** pre-signup preview → FR-17, FR-18; lightweight enrollment → FR-19; resume-exactly-where-left-off → FR-20, FR-21; graded interactive feedback → FR-22, FR-23; dual progress tracking → FR-25; completion moment → FR-26, FR-27.

## 3. Glossary

- **Course** — A collection of Modules created by one Instructor, belonging to one Category, with a Visibility of Public or Unlisted. Always free to any signed-in Learner.
- **Module** — A named grouping of Lessons within a Course, ordered by the Instructor.
- **Lesson** — A single unit of content within a Module, of exactly one Lesson Type. Ordered by the Instructor within its Module.
- **Lesson Type** — One of: Video, Text, PDF, Quiz, Interactive Code Exercise. Determines how a Lesson is authored and consumed.
- **Interactive Code Exercise** — A Lesson Type where a Learner writes code (e.g., a SQL query) against a sample dataset/environment and receives automated pass/fail feedback.
- **Instructor** — A signed-in user who has been granted Instructor status by the Admin and may create Courses. Every Instructor is also a Learner.
- **Learner** — Any signed-in user. Learners enroll in Courses, track Progress, and can hold Discussions and Ratings.
- **Admin** — The elevated role (Ahmed, v1) that can moderate any Comment, Rating, or Course.
- **Enrollment** — The relationship created when a Learner chooses to take a Course; required before Lesson content (beyond the Course detail page) is accessible.
- **Progress** — Per-Learner, per-Course record of which Lessons are complete, plus the Learner's last-viewed position for resuming.
- **Certificate** — A downloadable file issued to a Learner on completing all required Lessons in a Course.
- **Comment** — Learner-authored discussion content attached to a Course or a specific Lesson.
- **Rating** — A Learner's score (and optional written Review) for a Course they are Enrolled in.
- **Category** — A software/coding topic a Course is tagged under, used for browse and search.
- **Visibility** — Public (discoverable via browse/search) or Unlisted (accessible only via direct link) — set by the Instructor at publish time. Never gated by payment.

## 4. Features

### 4.1 Accounts & Authentication

**Description:** Every Sanabel user signs in the same way. Instructor status is not self-service — it is granted by the Admin. Ahmed holds the Admin role.

**Functional Requirements:**

#### FR-1: Email/password authentication
Any visitor can sign up and sign in using email and password.
**Consequences (testable):**
- New signups must verify their email address before the account is treated as merge-eligible with a social login on the same address (see FR-2).
- Password reset flow exists and works via email.
- Duplicate signup with an existing email is rejected with a clear message.

#### FR-2: Social login
Any visitor can sign up and sign in using Google or GitHub.
**Consequences (testable):**
- A social-login account and an email/password account sharing the same email are treated as the same user, not two separate accounts — but only once the email/password account's email has been verified. An unverified email/password signup does not auto-merge with a later social login on the same address, which closes the pre-registration account-takeover path.

#### FR-3: Role model
Every account is a Learner by default. An account only gains the Instructor role, and the ability to create a Course, once the Admin grants it (FR-4). Ahmed's account holds the Admin role in addition to Learner/Instructor.
**Consequences (testable):**
- A Learner without a granted Instructor role never sees Instructor-only surfaces (e.g., "Create a course," the "My Courses" authoring dashboard) anywhere in the product.

#### FR-4: Admin grants Instructor role
The Admin can grant (or revoke) the Instructor role on any Learner account; there is no self-service application or request flow in v1.
**Consequences (testable):**
- Only accounts the Admin has explicitly granted Instructor status can access course-authoring surfaces (FR-6 onward).

**Notes:** `[NOTE FOR PM]` v1 has no in-product request flow for a Learner to ask for Instructor access — grants happen out-of-band (e.g., Ahmed reaching out directly). Revisit if Sanabel needs to scale past personally-known instructors.

#### FR-5: Profile basics
Every user has a display name; Instructors additionally have a short bio shown on their Courses.
**Consequences (testable):**
- Course detail page (FR-18) renders the Instructor's display name and bio.

### 4.2 Course Authoring

**Description:** Realizes UJ-1. The authoring flow is deliberately front-loaded toward momentum: start a Course with almost nothing, structure it as an outline before writing content, and never lose work.

**Functional Requirements:**

#### FR-6: Low-friction course creation
An Instructor can create a Course by providing only a title, one-line description, and Category. Realizes UJ-1.
**Consequences (testable):**
- No other field is required to create a Course record.

#### FR-7: Outline-first structuring
An Instructor can add Modules and Lessons to a Course as a nested outline, naming a Lesson before authoring its content. Realizes UJ-1.
**Consequences (testable):**
- A Lesson can exist with a title only, in an unpublished/incomplete state, without blocking the addition of further Lessons.

#### FR-8: Drag-reorder
An Instructor can reorder Modules and Lessons via drag-and-drop directly within the outline view, without opening each item individually. Realizes UJ-1.

#### FR-9: Multi-format lesson authoring
An Instructor can set a Lesson's content using any one Lesson Type: Video (upload), Text (rich text with syntax-highlighted code blocks), PDF (upload), Quiz (multiple choice, auto-graded), or Interactive Code Exercise (learner writes code against a sample dataset, auto pass/fail). Realizes UJ-1.
**Consequences (testable):**
- Each Lesson has exactly one Lesson Type at a time.
- Text lessons render fenced code blocks with syntax highlighting.

**Out of Scope:**
- Mixing multiple Lesson Types within a single Lesson (e.g., inline video + quiz in one Lesson) — `[NOTE FOR PM]` Yousef's narration implied wanting text+video combined; v1 keeps one Lesson Type per Lesson, revisit if this friction proves real post-launch.

#### FR-10: Upload/processing status
Video and PDF uploads show an explicit status (queued, processing, ready, failed) visible to the Instructor at all times, with a retry action on failure. Realizes UJ-1.

#### FR-11: Upload limits
Video and PDF uploads are capped per Lesson and per Instructor to bound Cloudflare Stream cost exposure. `[ASSUMPTION: cap values not yet decided — draft starting point is 60 minutes of video per Lesson and 20 hours of stored video per Instructor per month, enforced server-side; confirm or adjust before build. See §8 Cost.]`
**Consequences (testable):**
- An upload exceeding the cap is rejected at upload time with a clear message, not silently truncated or accepted then billed.

#### FR-12: Autosave
All course-builder edits (outline structure, Lesson content, ordering) autosave continuously without an explicit save step. Realizes UJ-1.
**Consequences (testable):**
- Closing or crashing the builder tab mid-edit does not lose the last-autosaved state.

#### FR-13: Learner-accurate preview
An Instructor can preview a Course exactly as a Learner would experience it — including mobile rendering — before publishing, without publishing it first. Realizes UJ-1.

#### FR-14: Publish with visibility and category
An Instructor can publish a Course as Public or Unlisted, with a required Category. Realizes UJ-1.
**Consequences (testable):**
- Unlisted Courses do not appear in browse/search (FR-17) but are reachable via direct link.
- No pricing/paid option is presented at any point in the publish flow — Sanabel has no paid-course mechanism.

#### FR-15: Post-publish content changes
An Instructor can add Modules/Lessons to an already-published Course without disrupting Learners already enrolled. Realizes UJ-1 (Yousef publishes Unlisted "with two more modules to go").
**Consequences (testable):**
- A Learner who already earned a Certificate keeps it; newly added Lessons do not retroactively revoke a Certificate already issued. `[ASSUMPTION: default behavior — newly added Lessons are not required for Learners who completed the Course before the addition; confirm if Certificates should instead be reissuable/reversible.]`
- A currently-enrolled, not-yet-complete Learner sees new Lessons appear in their outline and progress bar automatically.

#### FR-16: Instructor analytics
An Instructor can view basic engagement data for their own published Course. Realizes UJ-1.
**Consequences (testable):**
- Per Lesson, the Instructor sees at least a view count and a completion count; drop-off is derivable from the two.

**Notes:** `[NOTE FOR PM]` Yousef's narration raised the idea of a pre-publish review queue for Public Courses (content vetting before public listing). Not committed in v1 — deferred and reasoned through in [addendum.md](addendum.md); Unlisted visibility is the interim workaround for Instructors not ready for public listing. `[NOTE FOR PM]` No Success Metric or FR currently models instructor-side growth or discoverability — FR-4's grant flow is entirely out-of-band, so a prospective Instructor unknown to Ahmed has no way to learn Sanabel accepts instructors at all. Revisit if the platform needs to grow past personally-known instructors. `[NOTE FOR PM]` Related: with instructor growth admin-gated, Browse/Search (FR-17) may launch with few or zero Public Courses — the empty/cold-start browse state isn't designed yet; see §10 Open Questions.

### 4.3 Course Discovery

**Description:** Realizes UJ-2 (discovery-by-link path) and the brief's browse/search requirement. Enough of a Course is visible pre-signup that a Learner can decide it's worth enrolling in — the "no forced signup before I know what I'm getting" pattern from Lina's journey. `[ASSUMPTION: the brief's literal scope line was "sign-in required to view any course"; this PRD narrows that to "sign-in required to view Lesson content," letting the Course detail page itself (title, outline, instructor, ratings) stay visible pre-signup. Deliberate refinement driven by Lina's journey, not scope creep — flag if the stricter original reading was intended.]`

**Functional Requirements:**

#### FR-17: Browse and search
Any visitor, signed in or not, can browse and search Public Courses by Category/topic.
**Consequences (testable):**
- Search matches against Course title, one-line description, and Category at minimum.
- Unlisted Courses never appear in browse or search results (see FR-14).

#### FR-18: Course detail page
Any visitor can view a Course's detail page — title, Instructor name/bio, preview (if provided), full Module/Lesson outline (titles only), and aggregate Rating with individual Reviews — without signing in. Realizes UJ-2.
**Consequences (testable):**
- Lesson *content* (video/text/PDF/quiz/exercise body) is not accessible from the detail page without Enrollment — only titles and structure are.

#### FR-19: Enrollment
A signed-in Learner can enroll in any Public or Unlisted Course they can reach, at no cost. Realizes UJ-2.
**Consequences (testable):**
- Enrollment is the only gate between the Course detail page and full Lesson content — no separate payment or approval step.

### 4.4 Learning Experience

**Description:** Realizes UJ-2. Once enrolled, the two contracts that matter most are: never lose the Learner's place, and give immediate feedback on graded work.

**Functional Requirements:**

#### FR-20: Progress display
An enrolled Learner sees an overall Course progress bar and per-Lesson completion checkmarks in the outline. Realizes UJ-2.

#### FR-21: Resume where left off
A "Continue" control takes the Learner directly to their last incomplete Lesson, from any device/session. Realizes UJ-2.

#### FR-22: Video playback controls
Video Lessons support playback speed control and resume-from-last-position within the Lesson. Realizes UJ-2.

#### FR-23: Interactive exercise grading
Interactive Code Exercises auto-grade a Learner's submission and return immediate pass/fail feedback with an explanatory hint on failure. Realizes UJ-2.

#### FR-24: Quiz grading
Quizzes auto-grade multiple-choice answers and return immediate feedback. Realizes UJ-2.

#### FR-25: Progress tracking
Progress is recorded per Learner per Course, updating as each Lesson, Quiz, or Interactive Code Exercise is completed, and persists indefinitely. Realizes UJ-2.

### 4.5 Certificates

**Description:** Realizes UJ-2's completion moment. v1 ships the simpler of two options considered — see [addendum.md](addendum.md) for the verifiable-certificate alternative and why it was deferred.

**Functional Requirements:**

#### FR-26: Certificate on completion
On completing all required Lessons, Quizzes, and Interactive Code Exercises in a Course, a Learner receives a Certificate as a downloadable file. Realizes UJ-2.
**Consequences (testable):**
- Certificate includes Learner name, Course title, Instructor name, and completion date.

**Out of Scope:**
- Public verification (unique ID/URL others can check) — deferred, see §10 Open Questions and addendum.

#### FR-27: Post-completion rating prompt
Completing a Course prompts the Learner to rate/review it. Realizes UJ-2.

### 4.6 Discussion

**Description:** Comments give Learners a way to ask questions and Instructors a way to see where learners get stuck, without needing a separate support channel.

**Functional Requirements:**

#### FR-28: Post comments
A signed-in Learner can post a Comment on a Course or on a specific Lesson.

#### FR-29: View comments
Comments on a Course or Lesson are visible to any enrolled Learner and the Course's Instructor, in chronological order. `[ASSUMPTION: flat/chronological, not deeply threaded — confirm if threaded replies matter for v1.]`

### 4.7 Ratings & Reviews

**Description:** Ratings feed both the Course detail page (helping the next Learner decide) and Instructor feedback.

**Functional Requirements:**

#### FR-30: Rate and review
A Learner enrolled in a Course can leave a 1–5 star Rating and an optional written Review, once per Course.

#### FR-31: Aggregate display
The Course detail page displays the aggregate Rating and individual written Reviews. Realizes UJ-2.

### 4.8 Moderation

**Description:** v1 moderation is manual-only by design — see [addendum.md](addendum.md) for the community-flagging/automated-filtering alternatives considered and deferred. This is the accepted tradeoff for a single-maintainer platform at launch scale.

**Functional Requirements:**

#### FR-32: Admin moderation
The Admin (Ahmed) can view and remove any Comment, Rating/Review, or Course.
**Consequences (testable):**
- Removal is visible to the content's author (e.g., their Comment disappears) but no automated flagging/reporting UI is required in v1.

### 4.9 Internationalization

**Description:** Sanabel's UI ships bilingual from v1, reflecting its name and intended audience reach. `[ASSUMPTION: the brief itself left "who this serves" (region/community) as an open question and never named Arabic-speaking learners specifically; this PRD infers that audience from the name Sanabel's Arabic etymology and Ahmed's explicit v1 language decision. Confirm the inference matches intent.]`

**Functional Requirements:**

#### FR-33: Bilingual UI
All platform UI (navigation, buttons, system messages, account flows) is available in English and Arabic, with correct right-to-left layout when Arabic is active.
**Consequences (testable):**
- Switching language does not require a re-login or lose in-progress state (e.g., a partially-filled course-builder form).

#### FR-34: Course content language
Course content itself (video, text, PDF, quiz/exercise text) is authored by the Instructor in whichever language they choose; Sanabel does not auto-translate content. `[ASSUMPTION: Instructors tag their Course's content language for Learner filtering — not explicitly discussed; confirm whether a Course-level language tag/filter is needed in v1 or content language is simply evident from the Course itself.]`

**Feature-specific NFRs:**
- RTL layout must be visually correct (not just mirrored text direction) across the course-builder outline, video player controls, and progress bar.

## 5. Non-Goals (Explicit)

- **No paid courses, ever.** No pricing tiers, no paywall, no "premium" Course — this is a permanent product principle, not a v1 scoping choice.
- **No advertising.** Sanabel does not carry ads to fund itself.
- **No mobile app in v1.** Web only; a native/PWA mobile experience is a possible later phase, not committed.
- **No donation/payment feature in v1.** Possible later addition per the brief, explicitly never a gate on access.
- **No automated content moderation in v1.** Manual admin review only; community flagging and automated filtering are deferred (see addendum).
- **No pre-publish content review queue in v1.** Instructors self-publish; Unlisted visibility is the only pre-public-listing gate.
- **No certificate verification portal in v1.** Certificates are downloadable files without a public lookup mechanism. `[NOTE FOR PM]` Revisit if learners start citing certificates to employers — the ID structure should be certificate-ready even if v1 doesn't expose verification.
- **No content auto-translation.** Bilingual scope covers platform UI, not machine-translating Instructor content.
- **No topics outside software/coding.** Category scope stays fixed to coding education.

## 6. MVP Scope

### 6.1 In Scope

- Email/password and social login accounts (FR-1, FR-2)
- Admin-granted Instructor role, no self-service application flow (FR-3, FR-4)
- Instructor course authoring: low-friction creation, outline-first Module/Lesson structuring, drag-reorder, five Lesson Types (Video, Text, PDF, Quiz, Interactive Code Exercise), autosave, upload status and limits, learner-accurate preview, publish with visibility + category, post-publish content changes (FR-6–FR-15)
- Instructor analytics (FR-16)
- Browse/search and pre-signup Course detail page (FR-17, FR-18)
- Enrollment, progress tracking, resume-where-left-off (FR-19–FR-21, FR-25)
- Video playback controls, graded quizzes, graded interactive code exercises with immediate feedback (FR-22–FR-24)
- Downloadable completion Certificates, post-completion rating prompt (FR-26, FR-27)
- Comments on Courses/Lessons (FR-28, FR-29)
- Ratings and Reviews (FR-30, FR-31)
- Manual admin moderation (FR-32)
- Bilingual English/Arabic UI with RTL support (FR-33, FR-34)
- Web application only
- Video hosting via Cloudflare Stream (see addendum)

One honest flag, not a re-litigation: the brief's original lesson-format scope was video/text/PDF/other. Interactive Code Exercises (FR-9, FR-23) — which, as specified, mean a sandboxed multi-language code-execution and auto-grading service, not merely "a console" — go well beyond that, and are the single largest technical-complexity addition in this PRD relative to the brief. Quizzes (FR-9, FR-24) are a smaller but related case: the brief's own Vision section listed quizzes only as a speculative future maybe ("richer lesson interactivity"), and this PRD pulls them forward into committed v1 scope. Both surfaced directly from Yousef's authoring journey as what would make him feel the platform "takes technical education seriously." Confirmed as intentional here so it's a visible, deliberate scope call rather than something that crept in unnoticed.

### 6.2 Out of Scope for MVP

Same list as §5 Non-Goals: mobile app, donation support, verifiable certificates, pre-publish review queue, community/automated moderation, content auto-translation, and paid courses. See §5 for the full rationale on each and which are permanent versus revisitable.

## 7. Cross-Cutting NFRs

- **Video delivery performance:** Video Lessons must start playback promptly and support adaptive/appropriate quality for the learner's connection — Cloudflare Stream is selected specifically for this (see addendum). `[ASSUMPTION: no numeric target set yet — draft starting point is time-to-first-frame under 3 seconds on a typical broadband connection, relying on Cloudflare Stream's built-in adaptive bitrate delivery rather than a custom encoding ladder for v1; confirm or adjust once real traffic patterns exist.]`
- **Code execution security:** Interactive Code Exercises (FR-9, FR-23) execute Learner-submitted code and must run it in a sandboxed environment with enforced CPU/memory/time limits and no network egress — this is a prerequisite for shipping the feature at all, not a hardening pass to add later, given real public traffic is expected at launch.
- **Data-loss prevention:** Autosave (FR-12) and upload status (FR-10) exist specifically to eliminate silent data loss during authoring — this is treated as a reliability requirement, not just a UX nicety.
- **Upload security:** Video/PDF uploads are validated for file type and size before processing; no executable or unexpected file types are accepted. Per-Lesson/per-Instructor upload caps (FR-11) are enforced at this same layer.
- **Accessibility:** Course text/video content should be usable with screen readers and keyboard navigation where feasible for a solo-built v1; full WCAG 2.1 AA conformance is aspirational, not a v1 gate, and no minimum keyboard-operability floor is set for v1 beyond this aspiration. `[ASSUMPTION: no formal accessibility compliance mandate applies to this personal project; revisit if Sanabel seeks institutional partners later.]` Video caption/transcript support is not committed in v1 — see §10 Open Questions.
- **Bilingual correctness:** RTL Arabic rendering is a first-class layout requirement across every UI surface, not just the three named in FR-33's NFR — including drag-and-drop reordering (FR-8), left-to-right code blocks and the code-exercise console embedded in an RTL page, transactional emails (password reset, notifications), and Certificate file rendering (FR-26). The embedded Cloudflare Stream player's own UI chrome is outside Sanabel's localization control and is not guaranteed to be RTL-correct.
- **Availability:** No formal uptime SLA, backup/disaster-recovery posture, or on-call/monitoring setup is defined for v1, consistent with a solo-maintained launch; Ahmed is the sole point of failure-detection. `[NOTE FOR PM]` Revisit if usage grows beyond what manual monitoring can catch.

## 8. Constraints and Guardrails

**Cost**
- Video hosting (Cloudflare Stream) is usage-based and is the platform's dominant infrastructure cost; there is no revenue to offset it. This is now enforced, not just watched: FR-11 caps upload size/duration per Lesson and per Instructor, with draft cap values marked `[ASSUMPTION]` pending Ahmed's confirmation.
- No paid tier exists to cap cost via monetization; cost containment comes from the FR-11 usage cap and manual oversight, not pricing.

**Privacy**
- Learner and Instructor accounts collect only what's needed to operate the platform (auth identity, profile basics, progress/enrollment records). `[ASSUMPTION: no formal GDPR/regional compliance program is in scope for v1 given personal-project status; standard reasonable-care data handling applies. Revisit if EU/regulated-region usage becomes material — bilingual EN/AR reach increases this likelihood versus an English-only platform.]`
- No account-deletion or data-export capability is committed in v1 — see §10 Open Questions; flagged as a gap worth closing before any regulated-region usage becomes material.

**Safety**
- Sanabel targets a general adult audience in v1 (confirmed); manual admin moderation (FR-32) is the only content-safety mechanism in v1 — accepted as sufficient at low launch volume, explicitly not scaling past a small userbase (see addendum). Revisit this posture if signup patterns suggest meaningful under-18 usage.
- No bot/abuse controls (CAPTCHA, rate limiting) are specified for signup (FR-1) or Comments (FR-28) — manual-only moderation assumes low, human-paced volume, which a scripted signup or comment-spam run would violate. See §10 Open Questions.

## 9. Success Metrics

*The brief's own bar for success is simply "it exists and works," not revenue or scale — these metrics are the launch-grade elaboration of that bar, scoped to what Ahmed explicitly asked this PRD to carry, not a pivot toward growth-at-all-costs.*

**Primary**
- **SM-1:** Ahmed creates and publishes one full multi-lesson Course end-to-end without external help. Validates FR-6–FR-16.
- **SM-2:** At least one Learner outside Ahmed signs in, discovers a Course, completes it, and receives a Certificate. Validates FR-17–FR-27.
- **SM-3:** Zero pricing/paid-access surface exists anywhere in the product at any time. Validates FR-14, §5 Non-Goals. `[NOTE FOR PM]` This is a standing invariant, not a one-time milestone — v1 has no automated check (CI gate, design-system constraint) enforcing it; it relies on manual review as the product evolves.

**Secondary**
- **SM-4:** Organic Discussion and Rating activity occurs (at least one Comment and one Rating not authored by Ahmed). Validates FR-28–FR-31.
- **SM-5:** Course completion rate is tracked and read against free-platform norms (5–15%, per research in addendum) rather than paid-platform expectations — a low rate is not treated as a failure signal on its own. Validates FR-25, FR-26.

**Counter-metrics (do not optimize)**
- **SM-C1:** Cloudflare Stream spend-per-active-learner should not be allowed to grow unbounded as a side effect of chasing enrollment growth. Counterbalances SM-2.
- **SM-C2:** Course quantity/Instructor signups should not be optimized at the expense of course quality — an unreviewed flood of low-effort Courses is a known early trap for open-upload platforms (see addendum). Counterbalances SM-1.

## 10. Open Questions

1. Should a lightweight pre-publish review queue exist for Public Courses, or does Unlisted-during-buildout + no gate on Public stay sufficient as volume grows? (See addendum — considered, deferred.)
2. Should Certificates move to a verifiable public-ID model before any external credibility claim (e.g., learners citing them to employers) becomes likely?
3. Is Course content itself expected to be offered in both English and Arabic per Course, or does an Instructor simply teach in one language with no in-product language tag/filter?
4. Should there be a cap (upload size, video duration, or monthly volume) on Instructor video uploads to bound Cloudflare Stream cost, given there's no revenue to offset it?
5. ~~Is Sanabel intended for a general adult audience, or could minors reasonably be expected to sign up?~~ **Resolved:** general adult audience for v1 (§8 Safety updated accordingly).
6. Should quiz/exercise "required" status be per-Lesson (all must pass for Certificate eligibility) or can some Lessons be marked supplementary/non-blocking?
7. Should Sanabel provide captions/transcripts for Video Lessons? §7's accessibility NFR aspires to screen-reader usability, but video currently has no text alternative at all.
8. Should learners be able to delete their account and export their data in v1? Not currently committed; §8 Privacy leans on "reasonable-care" handling without this baseline.
9. Should signup (FR-1) and Comment posting (FR-28) have bot/abuse controls (CAPTCHA, rate limiting)? Manual-only moderation assumes human-paced volume that scripted abuse wouldn't respect.
10. How should Interactive Code Exercises actually be authored — what languages beyond SQL are in scope, how does an Instructor define grading logic/expected output, and what dataset formats/size limits apply? UJ-1/UJ-2 only worked a SQL example; the general case has no FR coverage yet.
11. What does Browse/Search (FR-17) show when there are few or zero Public Courses, given Instructor growth is admin-gated (FR-4) and could plausibly launch thin?

## 11. Assumptions Index

- §4.2 FR-11 — Draft upload cap values (60 min/Lesson, 20 hrs/Instructor/month) not yet confirmed by Ahmed.
- §4.2 FR-15 — Default behavior for already-issued Certificates when a Course later gains required Lessons: not retroactively required.
- §4.3 — Course detail page stays visible pre-signup, narrowing the brief's literal "sign-in required to view any course" line to "sign-in required for Lesson content."
- §4.6 FR-29 — Comments are flat/chronological, not threaded.
- §4.9 — Bilingual English/Arabic v1 scope infers an Arabic-speaking audience from the name's etymology; the brief itself left "who this serves" (region) open.
- §4.9 FR-34 — Course content is not auto-translated; Instructors choose their own content language, with an open question on whether a language tag/filter is needed.
- §7 — No formal accessibility (WCAG) compliance mandate applies to v1; treated as aspirational.
- §7 — Video-delivery performance target (time-to-first-frame under 3s) is a draft starting point, not confirmed.
- §8 Privacy — No formal GDPR/regional compliance program is in scope for v1.

**Related deferred item, not an `[ASSUMPTION]` tag:** §4.2 FR-9's Out of Scope note ("A Lesson has exactly one Lesson Type") is a `[NOTE FOR PM]`, not an inline assumption — listed here only to correct an earlier indexing error, not duplicated as an assumption.
