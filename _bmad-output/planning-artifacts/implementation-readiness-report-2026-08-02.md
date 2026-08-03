---
stepsCompleted: [1, 2, 3, 4, 5, 6]
---

# Implementation Readiness Assessment Report

**Date:** 2026-08-02
**Project:** BMAD Test

> **Update (2026-08-03):** All 3 Major issues below have been closed directly in `ARCHITECTURE-SPINE.md` and `epics.md` — see [Post-Assessment Fixes](#post-assessment-fixes-2026-08-03) at the end of this report. Findings below are left as originally written (the historical record of what the assessment found), not edited in place.

## Document Inventory

### Product Brief

**Whole Documents:**
- `briefs/brief-BMAD Test-2026-07-30/brief.md` (5,056 B, modified 2026-07-30)

### PRD

**Whole Documents:**
- `prds/prd-BMAD Test-2026-07-30/prd.md` (37,999 B, modified 2026-07-30)
- `prds/prd-BMAD Test-2026-07-30/addendum.md` (3,753 B, modified 2026-07-30) — addendum to the PRD

**Supporting/Review Files (not primary assessment input):**
- `reconcile-brief.md`, `review-adversarial-general.md`, `review-rubric.md`

**Sharded Documents:** none found

### Architecture

**Whole Documents:**
- `architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md` (21,975 B, modified 2026-08-02)
- `architecture/architecture-BMAD Test-2026-08-02/SOLUTION-DESIGN.md` (24,192 B, modified 2026-08-02)

**Sharded Documents:** none found

### Epics & Stories

**Whole Documents:**
- `epics.md` (57,361 B, modified 2026-08-02)

**Sharded Documents:** none found

### UX Design

**Whole Documents:**
- `ux-designs/ux-BMAD Test-2026-08-02/DESIGN.md` (18,837 B, modified 2026-08-02)
- `ux-designs/ux-BMAD Test-2026-08-02/EXPERIENCE.md` (18,035 B, modified 2026-08-02)

**Sharded Documents:** none found

## Issues Found

- No duplicate document formats (whole + sharded) detected — one dated folder per document type.
- All four core document types (PRD, Architecture, Epics, UX) are present. Brief is also present as supporting context.
- The PRD has an `addendum.md` alongside `prd.md` — both will be treated as part of the PRD for this assessment (addendum applied on top of base PRD).

## Files Selected for Assessment

- **Brief:** `brief.md`
- **PRD:** `prd.md` + `addendum.md`
- **Architecture:** `ARCHITECTURE-SPINE.md` + `SOLUTION-DESIGN.md`
- **Epics & Stories:** `epics.md`
- **UX:** `DESIGN.md` + `EXPERIENCE.md`

## PRD Analysis

**Source:** PRD: Sanabel (`prd.md`, status: final, 2026-07-30) + `addendum.md`

### Functional Requirements

**§4.1 Accounts & Authentication**
- **FR-1:** Email/password authentication. Any visitor can sign up and sign in using email and password. Email verification required before merge-eligible with social login (FR-2); password reset flow via email; duplicate signup with existing email rejected with clear message.
- **FR-2:** Social login via Google or GitHub. A social-login account and email/password account sharing the same email are treated as the same user only once the email/password account's email is verified (prevents pre-registration account-takeover).
- **FR-3:** Role model. Every account is a Learner by default; gains Instructor role only once Admin grants it. A Learner without granted Instructor role never sees Instructor-only surfaces.
- **FR-4:** Admin grants Instructor role. Admin can grant/revoke Instructor role on any Learner account; no self-service application/request flow in v1.
- **FR-5:** Profile basics. Every user has a display name; Instructors additionally have a short bio shown on their Courses.

**§4.2 Course Authoring**
- **FR-6:** Low-friction course creation. Instructor creates a Course with only title, one-line description, and Category — no other field required.
- **FR-7:** Outline-first structuring. Instructor adds Modules/Lessons as a nested outline, naming a Lesson before authoring content; a Lesson can exist title-only/incomplete without blocking further Lessons.
- **FR-8:** Drag-reorder of Modules and Lessons directly within the outline view.
- **FR-9:** Multi-format lesson authoring — one Lesson Type per Lesson: Video (upload), Text (rich text, syntax-highlighted code blocks), PDF (upload), Quiz (multiple choice, auto-graded), Interactive Code Exercise (learner writes code against sample dataset, auto pass/fail). Out of scope: mixing multiple Lesson Types within one Lesson.
- **FR-10:** Upload/processing status. Video/PDF uploads show explicit status (queued, processing, ready, failed) with a retry action on failure.
- **FR-11:** Upload limits. Video/PDF uploads capped per Lesson and per Instructor to bound Cloudflare Stream cost. `[ASSUMPTION]` draft caps: 60 min/Lesson, 20 hrs/Instructor/month, enforced server-side, not yet confirmed. Exceeding cap is rejected at upload time, not silently truncated/billed.
- **FR-12:** Autosave. All course-builder edits (outline, content, ordering) autosave continuously; closing/crashing the builder tab mid-edit does not lose last-autosaved state.
- **FR-13:** Learner-accurate preview. Instructor can preview a Course exactly as a Learner would, including mobile rendering, before publishing.
- **FR-14:** Publish with visibility and category. Instructor publishes as Public or Unlisted with required Category. Unlisted Courses don't appear in browse/search but are reachable via direct link. No pricing/paid option presented anywhere in publish flow.
- **FR-15:** Post-publish content changes. Instructor can add Modules/Lessons to an already-published Course without disrupting enrolled Learners. `[ASSUMPTION]` A Learner who already earned a Certificate keeps it; newly added Lessons don't retroactively revoke it. A currently-enrolled, not-yet-complete Learner sees new Lessons appear automatically.
- **FR-16:** Instructor analytics. Instructor views basic engagement data for their own published Course — at minimum per-Lesson view count and completion count (drop-off derivable).

**§4.3 Course Discovery**
- **FR-17:** Browse and search. Any visitor (signed in or not) can browse/search Public Courses by Category/topic. Search matches Course title, description, Category at minimum. Unlisted Courses never appear.
- **FR-18:** Course detail page. Any visitor can view title, Instructor name/bio, preview (if provided), full Module/Lesson outline (titles only), aggregate Rating and individual Reviews — without signing in. Lesson *content* is not accessible without Enrollment.
- **FR-19:** Enrollment. A signed-in Learner can enroll in any Public or Unlisted Course they can reach, at no cost — the only gate between detail page and full Lesson content.

**§4.4 Learning Experience**
- **FR-20:** Progress display — overall Course progress bar and per-Lesson completion checkmarks in the outline.
- **FR-21:** Resume where left off — a "Continue" control takes the Learner directly to their last incomplete Lesson, from any device/session.
- **FR-22:** Video playback controls — playback speed control and resume-from-last-position within the Lesson.
- **FR-23:** Interactive exercise grading — auto-grades submission, immediate pass/fail feedback with explanatory hint on failure.
- **FR-24:** Quiz grading — auto-grades multiple-choice answers with immediate feedback.
- **FR-25:** Progress tracking — recorded per Learner per Course, updates as each Lesson/Quiz/Exercise completes, persists indefinitely.

**§4.5 Certificates**
- **FR-26:** Certificate on completion. On completing all required Lessons/Quizzes/Exercises, Learner receives a downloadable Certificate including Learner name, Course title, Instructor name, completion date. Out of scope: public verification (unique ID/URL).
- **FR-27:** Post-completion rating prompt — completing a Course prompts the Learner to rate/review it.

**§4.6 Discussion**
- **FR-28:** Post comments — signed-in Learner can post a Comment on a Course or specific Lesson.
- **FR-29:** View comments — visible to any enrolled Learner and the Course's Instructor, chronological order. `[ASSUMPTION]` flat/chronological, not threaded.

**§4.7 Ratings & Reviews**
- **FR-30:** Rate and review — enrolled Learner can leave a 1–5 star Rating and optional written Review, once per Course.
- **FR-31:** Aggregate display — Course detail page displays aggregate Rating and individual written Reviews.

**§4.8 Moderation**
- **FR-32:** Admin moderation — Admin (Ahmed) can view and remove any Comment, Rating/Review, or Course. Removal is visible to the content's author; no automated flagging/reporting UI required in v1.

**§4.9 Internationalization**
- **FR-33:** Bilingual UI — all platform UI available in English and Arabic with correct RTL layout when Arabic is active. Switching language doesn't require re-login or lose in-progress state.
- **FR-34:** Course content language — content authored by Instructor in whichever language they choose; no auto-translation. `[ASSUMPTION]` whether a Course-level language tag/filter is needed is unconfirmed.

**Total FRs: 34**

### Non-Functional Requirements

**Cross-Cutting NFRs (§7):**
- **NFR-1 (Performance):** Video delivery — Video Lessons must start playback promptly with adaptive/appropriate quality for the learner's connection (Cloudflare Stream adaptive bitrate). `[ASSUMPTION]` draft target: time-to-first-frame under 3s on typical broadband, not yet confirmed.
- **NFR-2 (Security):** Code execution security — Interactive Code Exercises must run Learner-submitted code in a sandboxed environment with enforced CPU/memory/time limits and no network egress; a prerequisite for shipping, not a later hardening pass.
- **NFR-3 (Reliability):** Data-loss prevention — Autosave (FR-12) and upload status (FR-10) exist specifically to eliminate silent data loss during authoring; treated as a reliability requirement.
- **NFR-4 (Security):** Upload security — Video/PDF uploads validated for file type and size before processing; no executable/unexpected file types accepted; per-Lesson/per-Instructor caps (FR-11) enforced at this layer.
- **NFR-5 (Usability/Accessibility):** Course text/video content should be usable with screen readers and keyboard navigation where feasible; full WCAG 2.1 AA conformance is aspirational, not a v1 gate; no minimum keyboard-operability floor set. `[ASSUMPTION]` no formal accessibility compliance mandate applies to v1. Caption/transcript support not committed in v1.
- **NFR-6 (Usability/i18n):** Bilingual correctness — RTL Arabic rendering is a first-class layout requirement across every UI surface (not just FR-33's three named areas), including drag-and-drop reordering (FR-8), LTR code blocks/exercise console embedded in an RTL page, transactional emails, and Certificate file rendering. Embedded Cloudflare Stream player chrome is outside Sanabel's localization control.
- **NFR-7 (Reliability/Availability):** No formal uptime SLA, backup/disaster-recovery posture, or on-call/monitoring setup defined for v1; Ahmed is the sole point of failure-detection.

**Feature-Specific NFR (§4.9, under FR-33/34):**
- **NFR-8 (Usability/i18n):** RTL layout must be visually correct (not just mirrored text direction) across the course-builder outline, video player controls, and progress bar.

**Total NFRs: 8**

### Additional Requirements (Constraints & Guardrails, §8)

- **Cost:** Video hosting (Cloudflare Stream) is usage-based and the dominant infra cost with no revenue to offset it; FR-11's upload caps are the enforced cost-containment mechanism (draft values unconfirmed).
- **Privacy:** Accounts collect only what's needed to operate the platform. `[ASSUMPTION]` No formal GDPR/regional compliance program in scope for v1. No account-deletion or data-export capability committed in v1 (flagged as a gap — see PRD §10 Open Questions).
- **Safety:** General adult audience targeted (confirmed). Manual admin moderation (FR-32) is the only content-safety mechanism, accepted as insufficient past a small userbase. No bot/abuse controls (CAPTCHA, rate limiting) specified for signup (FR-1) or Comments (FR-28).
- **Non-Goals (§5, permanent unless noted revisitable):** No paid courses ever; no advertising; no mobile app in v1; no donation/payment feature in v1; no automated content moderation in v1; no pre-publish content review queue in v1; no certificate verification portal in v1 (certificate structure should remain verification-ready); no content auto-translation; no topics outside software/coding.
- **Open Questions carried forward from PRD §10 (11 unresolved items)** — most material to readiness/coverage validation:
  - OQ-1: Pre-publish review queue for Public Courses?
  - OQ-2: Certificates move to verifiable public-ID model?
  - OQ-3: Is Course content itself expected bilingual, or Instructor-single-language with no tag/filter?
  - OQ-4: Confirm upload cap values (FR-11).
  - OQ-6: Is quiz/exercise "required" status per-Lesson, or can some be non-blocking?
  - OQ-7: Captions/transcripts for Video Lessons?
  - OQ-8: Account deletion / data export in v1?
  - OQ-9: Bot/abuse controls (CAPTCHA, rate limiting) for signup/Comments?
  - OQ-10: How are Interactive Code Exercises actually authored — languages beyond SQL, grading-logic definition, dataset formats/size limits? (No FR coverage for the general case — UJ-1/UJ-2 only worked a SQL example.)
  - OQ-11: What does Browse/Search show when there are few/zero Public Courses (Instructor growth is admin-gated)?

### PRD Completeness Assessment

The PRD is thorough and internally disciplined: every FR is globally numbered and stable, each maps explicitly back to a Key User Journey (UJ-1/UJ-2), and `[ASSUMPTION]`/`[NOTE FOR PM]` tags are self-indexed in §11 rather than buried in prose. Cross-cutting NFRs (§7) and constraints (§8) are unusually well-articulated for a solo-builder project, particularly the code-execution sandboxing requirement (NFR-2) and RTL-as-first-class-citizen framing (NFR-6/8).

Two gaps stand out as material to epic/story coverage validation in the next step:
1. **OQ-10 (Interactive Code Exercise authoring mechanics)** has no FR coverage at all beyond the SQL example worked through the user journeys — this is flagged in the PRD itself as an open gap, and the largest technical-complexity item in the whole document (per §6.1's own flag). Epics/Stories should be checked for whether they've silently resolved this or inherited the gap.
2. Several `[ASSUMPTION]` tags (FR-11 upload caps, FR-15 certificate-reissuance behavior, FR-29 threading, FR-34 language tagging) represent decisions the PRD made unilaterally pending Ahmed's confirmation — these are traceability risks if downstream Architecture/Epics baked in a specific interpretation without flagging it as still-open.

## Epic Coverage Validation

**Source:** `epics.md` — includes its own "FR Coverage Map" (lines 125–160) and full story-level Acceptance Criteria for all 7 epics / 33 stories. Coverage below was independently verified against actual story ACs, not just the claimed map.

### Coverage Matrix

| FR Number | PRD Requirement (short) | Epic Coverage | Status |
|---|---|---|---|
| FR-1 | Email/password auth | Epic 1 → Story 1.1 | ✓ Covered |
| FR-2 | Social login (Google/GitHub) | Epic 1 → Story 1.2 | ✓ Covered |
| FR-3 | Role model | Epic 1 → Story 1.3 | ✓ Covered |
| FR-4 | Admin grants/revokes Instructor role | Epic 1 → Story 1.4 | ✓ Covered |
| FR-5 | Profile basics | Epic 1 → Story 1.5 | ✓ Covered |
| FR-6 | Low-friction course creation | Epic 2 → Story 2.1 | ✓ Covered |
| FR-7 | Outline-first structuring | Epic 2 → Story 2.2 | ✓ Covered |
| FR-8 | Drag-reorder | Epic 2 → Story 2.3 | ✓ Covered |
| FR-9 | Multi-format lesson authoring (5 types) | Epic 2 → Stories 2.4–2.8 | ✓ Covered |
| FR-10 | Upload/processing status | Epic 2 → Stories 2.4, 2.6 | ✓ Covered |
| FR-11 | Upload limits | Epic 2 → Stories 2.4, 2.6 | ✓ Covered |
| FR-12 | Autosave | Epic 2 → Stories 2.2, 2.4–2.8 | ✓ Covered |
| FR-13 | Learner-accurate preview | Epic 2 → Story 2.9 | ✓ Covered |
| FR-14 | Publish with visibility + category | Epic 2 → Story 2.10 | ✓ Covered |
| FR-15 | Post-publish content changes | Epic 2 → Story 2.11 | ✓ Covered |
| FR-16 | Instructor analytics | Epic 2 → Story 2.12 | ✓ Covered |
| FR-17 | Browse and search | Epic 3 → Story 3.1 | ✓ Covered |
| FR-18 | Course detail page (pre-signup) | Epic 3 → Story 3.2 | ✓ Covered |
| FR-19 | Enrollment | Epic 3 → Story 3.3 | ✓ Covered |
| FR-20 | Progress display | Epic 4 → Story 4.1 | ✓ Covered |
| FR-21 | Resume where left off | Epic 4 → Story 4.2 | ✓ Covered |
| FR-22 | Video playback controls | Epic 4 → Story 4.3 | ✓ Covered |
| FR-23 | Interactive exercise grading | Epic 4 → Story 4.5 | ✓ Covered |
| FR-24 | Quiz grading | Epic 4 → Story 4.4 | ✓ Covered |
| FR-25 | Progress tracking | Epic 4 → Story 4.1 | ✓ Covered |
| FR-26 | Certificate on completion | Epic 5 → Story 5.1 | ✓ Covered |
| FR-27 | Post-completion rating prompt | Epic 5 → Story 5.2 | ✓ Covered |
| FR-28 | Post comments | Epic 6 → Story 6.1 | ✓ Covered |
| FR-29 | View comments | Epic 6 → Story 6.1 | ✓ Covered |
| FR-30 | Rate and review | Epic 5 → Story 5.2 | ✓ Covered |
| FR-31 | Aggregate rating display | Epic 5 → Story 5.3 | ✓ Covered |
| FR-32 | Admin moderation | Epic 7 → Story 7.1 | ✓ Covered |
| FR-33 | Bilingual UI (RTL) | Epic 1 → Story 1.6 | ✓ Covered |
| FR-34 | Course content language | Epic 2 → Story 2.1 (AC2) | ✓ Covered |

### Missing Requirements

None. All 34 PRD FRs have a claimed *and* verified story-level home with concrete, testable Acceptance Criteria. No FRs appear in the epics document that aren't traceable back to the PRD.

**Notable positive finding — OQ-10 resolved downstream, not left open:** PRD Open Question 10 ("how are Interactive Code Exercises actually authored — languages beyond SQL, grading logic, dataset limits?") flagged itself as having *no FR coverage*. The epics/architecture layer in fact resolved this: Architecture AD-8 fixes v1 scope to SQL-only via PGlite in an isolated `worker_thread`, and Epic 2 Story 2.8 + Epic 4 Story 4.5 carry full story-level ACs for authoring and grading. This is good traceability, but the PRD itself should be updated to close OQ-10 and note the SQL-only decision — right now the PRD and the epics disagree about whether this question is still open.

### Coverage Statistics

- Total PRD FRs: 34
- FRs covered in epics: 34
- Coverage percentage: 100%

## UX Alignment Assessment

### UX Document Status

**Found.** Two files: `DESIGN.md` (visual system — colors, typography, spacing, components, tokens) and `EXPERIENCE.md` (behavioral spine — information architecture, voice/tone, component behavior, state patterns, accessibility floor, key flows for UJ-1/UJ-2). Both are status: final, dated 2026-08-02, and explicitly cite the PRD and brief as sources.

### A. UX ↔ PRD Alignment

Strong alignment, verified in both directions:
- `EXPERIENCE.md`'s Information Architecture table maps every FR that has a UI surface to a named screen/flow (FR-1 through FR-34 all appear at least once).
- Both Key User Journeys in `EXPERIENCE.md` mirror the PRD's UJ-1/UJ-2 narratives near-verbatim, including the same named edge cases (failed video upload, weeks-later return).
- UX correctly carries forward PRD nuances the epics also picked up: certificate-required-per-lesson defaulting true (FR-15/FR-26), flat/chronological comments (FR-29's `[ASSUMPTION]`), course-language badge/filter (FR-34's open question — UX resolves it as a single-select badge + Browse filter, same direction as Architecture AD-9's `contentLanguage` tag).
- No PRD requirement is unaddressed in the UX docs, and no UX-invented user-facing requirement contradicts a PRD non-goal (no pricing UI anywhere, no mobile-app-only pattern, no auto-translation control).

### B. UX ↔ Architecture Alignment

Mostly strong, with one real gap and one confirmed-compatible assumption to close out:

- **Frontend stack: aligned by design.** `SOLUTION-DESIGN.md` states the frontend layer (React, Tailwind, shadcn/ui) "was already set by DESIGN.md; the rest of the stack fills in around it" — Architecture deliberately treats UX as upstream here rather than re-deciding it. `next-intl` (Architecture's i18n choice) is purpose-selected for RTL/ICU Arabic support, matching `DESIGN.md`/`EXPERIENCE.md`'s bilingual-first requirement. Cloudflare Stream (video) and the Playwright-based certificate rendering (chosen specifically to avoid a known Arabic bidi rendering bug in the alternative library) both directly serve UX requirements (video player chrome, bilingual certificate rendering).
- **Gap — Accessibility commitment level disagrees across documents.** `EXPERIENCE.md`'s Accessibility Floor states it "sets a concrete practical floor **above** the PRD's aspirational framing — full keyboard operability... built in from day one, not retrofitted," and epics.md's story-level ACs (Stories 1.6, 2.3, 3.1, etc.) encode this as hard, testable Given/When/Then requirements (keyboard-equivalent for every drag-reorder, `aria-live` announcements for autosave/upload status, minimum touch target size). But `ARCHITECTURE-SPINE.md`'s own accessibility line states "keyboard operability and screen-reader semantics remain v1 best-effort per the PRD's own framing (aspirational, not a launch gate)" — explicitly the *softer* PRD stance, not UX's harder one. Architecture commits to color-contrast AA (structurally enforced via DESIGN.md's paired tokens) but does not commit to the keyboard/ARIA floor that UX and the epics' own acceptance criteria already treat as mandatory. This is a real three-way inconsistency: PRD (aspirational) vs. UX+Epics (mandatory, testable) vs. Architecture (defers to PRD's softer framing) — worth resolving explicitly before implementation, since Architecture is the document that should be setting the technical floor the stories can rely on.
- **Unconfirmed but low-risk — code editor library.** `DESIGN.md`/`EXPERIENCE.md` both tag the code editor component "Monaco-style" as an `[ASSUMPTION]`. Neither `ARCHITECTURE-SPINE.md` nor `SOLUTION-DESIGN.md` names a specific code-editor library in the stack table — only the grading contract (AD-8, `submit(exerciseId, code) → {pass|fail, message}`) is architecturally bound, not the editor UI component itself. This isn't a contradiction, but it is an unclosed decision: the actual library (Monaco vs. CodeMirror vs. other) is left to implementation time with no architectural record of the choice.

### Warnings

- **Accessibility floor mismatch (see above)** — recommend Architecture either adopt UX/Epics' harder keyboard/ARIA commitment explicitly, or the PM/Architect reconcile downward with UX and Epics before Sprint Planning, so Dev Story work isn't implementing acceptance criteria the Architecture spine doesn't consider load-bearing.
- **Code editor library choice unbound** — low risk (isolated to Epic 2/4's exercise-authoring and exercise-taking UI), but should get a one-line Architecture Decision before Epic 2/4 stories reach Dev, since `EXPERIENCE.md`'s Component Patterns table treats "Monaco-style" as settled when it is still tagged `[ASSUMPTION]`.
- No warning needed for UX-document existence — both files are present, final, and thorough.

## Epic Quality Review

Applied create-epics-and-stories standards to all 7 epics / 33 stories in `epics.md`, and cross-checked epic/story assumptions against `ARCHITECTURE-SPINE.md` and its own adversarial-review history (`reviews/review-incompatible-units.md`, `reviews/review-rubric-walker.md`) to see which architecture gaps those reviews raised are still live at the point stories would hand off to Dev.

### A. User Value Focus

All 7 epic titles/goals describe a user-facing outcome (Instructor authors, Learner discovers/learns/certifies/rates, Admin moderates) — none read as a pure technical milestone ("Setup Database," "API Development"). Epic 1's title ("Foundation, Accounts & Bilingual Shell") is the only borderline case — see Minor Concerns below — but every one of its 6 stories is itself a genuine user story (sign up, sign in, role-gated nav, admin grant, profile, bilingual shell), so the epic as a whole passes.

### B. Epic Independence

Verified the full dependency chain — every epic depends only on **earlier** epics' outputs, never a later one:

| Epic | Depends on | Forward-dependency violation? |
|---|---|---|
| 1. Foundation, Accounts & Bilingual Shell | none | No |
| 2. Course Authoring | Epic 1 (Instructor role) | No |
| 3. Course Discovery & Enrollment | Epic 1 (accounts), Epic 2 (published courses to discover) | No |
| 4. Learning Experience | Epic 1, 2 (authored content), 3 (enrollment) | No |
| 5. Certificates & Ratings | Epic 4 (completion detection) | No |
| 6. Discussion | Epic 1 (accounts), Epic 3 (enrollment-gated visibility) | No |
| 7. Admin Moderation | Epic 2, 5, 6 (content to moderate) | No |

No epic requires a later epic to function — this is a clean, strictly backward dependency graph. **No critical violations.**

### C. Story Sizing & Acceptance Criteria Quality

Acceptance criteria are consistently Given/When/Then, testable, and specific — this is a genuine strength of the document. Error paths are routinely covered (duplicate signup, upload-cap rejection, failed grading, blocked unauthorized access), not just happy paths. No vague criteria ("user can login") were found.

A number of stories reference a *later* epic by name inside an AC (e.g., Story 2.9 AC3: "live grading... becomes fully functional once Epic 4 ships"; Story 2.11 AC3: "upheld once Epic 5 ships Certificate issuance"). These are **not** forward-dependency violations in the blocking sense the checklist warns about — each such story is still independently completable and delivers value on its own (Story 2.9 ships a working content/layout preview without Epic 4; Story 2.11 ships without Epic 5). They're disclosed sequencing notes, which is good practice, not a defect.

### D. Database/Entity Creation Timing

Tables are introduced story-by-story as first needed, not front-loaded: Account/Session (Epic 1) → Course/Module/Lesson (Epic 2) → Enrollment (Epic 3) → Progress/Attempt (Epic 4) → Certificate/Rating (Epic 5) → Comment (Epic 6). This matches the "right" pattern, not the "Epic 1 Story 1 creates all tables upfront" anti-pattern.

### E. Special Implementation Checks

**Starter template:** Architecture confirms no starter template is specified (greenfield, built from scratch) — the starter-template story requirement doesn't strictly apply. **However**, per the greenfield checklist ("Initial project setup story, Development environment configuration, CI/CD pipeline setup early"), see Major Issue 1 below.

### 🔴 Critical Violations

None found. No technical-milestone epics, no forward-dependency-breaking epics, no unfeasibly-large stories.

### 🟠 Major Issues

1. **No dedicated project-scaffold story.** Epic 1's description states it "carries the one-time project scaffold (Next.js 16, Drizzle/Postgres on Neon, Better Auth, next-intl + RTL layout primitives, DESIGN.md token/component system, Vercel deployment) since no starter template is specified" — but none of Stories 1.1–1.6 has acceptance criteria for the scaffold itself (repo init, CI wiring, Vercel+Neon preview-branch pipeline per AD-12, base DESIGN.md token integration). It's implicitly assumed to happen somewhere before/during Story 1.1 with no way to verify "is the scaffold actually done" as a story of its own. **Recommendation:** add a Story 1.0 ("Project Scaffold & Deployment Pipeline") with concrete ACs (repo builds, CI green, a PR opens a working preview deploy against an ephemeral Neon branch, base token/i18n config loads) ahead of Story 1.1.

2. **Quiz grading (FR-24) has no architectural contract, unlike its sibling graded Lesson Type.** AD-8 pins an explicit, security-conscious contract for Interactive Code Exercises (`submit(exerciseId, code) → {pass|fail, message}`, server-side only). No equivalent AD exists for Quiz grading. This is not just a documentation gap — the architecture's own adversarial review (`review-incompatible-units.md`, Finding 8) already walked the concrete failure mode: without a pinned server-side-only contract, a plausible-looking implementation could grade multiple-choice answers client-side and ship `correctAnswer` to the browser, letting any Learner always pass by reading the network tab. Story 4.4's ACs ("grading is synchronous") don't rule this out. **This finding is still open** — it was raised before the current architecture draft and was not addressed in the fixes applied to other findings from the same review (see Section F). **Recommendation:** extend AD-8 (or add AD-8b) to bind Quiz grading with the same "server-side only, contract-shaped" rule before Epic 4/Story 4.4 reaches Dev.

3. **Certificate content: snapshot-at-issuance vs. live-derived is unresolved.** AD-7 pins that Certificate *issuance* (the row's existence) is a persisted one-time event, but neither AD-7 nor Story 5.1's ACs state whether the *displayed* Learner name / Course title / Instructor name are frozen onto the Certificate row at issuance or re-derived live from current Account/Course data on each view/download. If an Instructor renames a Course, or a Learner changes their display name, after a Certificate is issued, two independently-built surfaces (the PDF generator vs. a future "My Certificates" list) could show two different values for the same certificate. **Recommendation:** add one line to AD-7 (or Story 5.1's ACs) pinning content as a frozen snapshot, matching what `review-incompatible-units.md` (Finding 6) already proposed.

### 🟡 Minor Concerns

1. **Epic 1's title leans technical.** "Foundation, Accounts & Bilingual Shell" mixes a technical word ("Foundation") with user-facing scope. Not a violation given every story underneath is genuinely user-facing, but a purely outcome-framed title (e.g., "Sign Up, Sign In, and Use Sanabel in Your Language") would read more cleanly against the "epics deliver user value" standard.
2. **Epic/module naming mismatch.** Architecture's AD-2 assigns `Enrollment` ownership to the "Learning Experience" module, but Enrollment is built in Epic 3 ("Course Discovery & Enrollment"), not Epic 4 ("Learning Experience"). No functional problem — epics are journey-organized, not module-organized, which is expected — but worth flagging so Sprint Planning doesn't assume a 1:1 epic↔module mapping.
3. **AD-5's upload Route Handler wording is still ambiguous** ("the single upload-initiation Route Handler" — one handler total, or one per media kind?) — flagged by the architecture's own adversarial review and not reworded in the current draft. Low risk (Stories 2.4/2.6 don't depend on this distinction), but cheap to clarify before Epic 2's upload stories reach Dev.
4. **PRD Open Question 11 (thin/empty Browse catalog) has no Architecture Deferred entry**, unlike every other PRD Open Question. In practice this is already closed at the UX/Epic level — Story 3.1 and UX-DR15 both define the cold-start empty state explicitly — so the practical risk this created (two builders inventing incompatible "Featured courses" answers) is resolved by the epics layer even though Architecture's own Deferred list was never updated to say so.

### F. Cross-Reference: Architecture's Own Adversarial Review — What's Still Live

`ARCHITECTURE-SPINE.md` already went through two rounds of adversarial self-review (`reviews/review-incompatible-units.md`: 13 findings; `reviews/review-rubric-walker.md`: 5 findings). Spot-checking the current spine text against both shows the large majority were fixed — including all Critical/High items (AD-3's missing dependency-graph edges, AD-7's Lesson/Quiz/Exercise data-model contradiction, AD-9's content-language field being pulled out of Deferred, AD-6's helper signatures, AD-10/AD-11's soft-delete/access-gate integration, AD-13's uniqueness constraints). That's a genuinely strong signal about how this architecture was hardened before reaching epics.

The items **confirmed still open** in the current spine are exactly Major Issues 2–3 and Minor Concerns 3–4 above (Quiz grading contract, Certificate snapshot semantics, AD-5 wording, OQ-11 Deferred entry) — both adversarial reviews are worth keeping attached to the project as a running punch list, since they've already proven accurate once.

## Summary and Recommendations

### Overall Readiness Status

**NEEDS WORK** — not a blocking failure, but real gaps to close before Sprint Planning starts consuming these documents at face value.

The foundation is genuinely strong: 100% of the PRD's 34 FRs are traced to story-level Acceptance Criteria, epic sequencing has zero forward-dependency violations, story ACs are consistently specific and testable, and the Architecture spine already absorbed two rounds of its own adversarial review — fixing every Critical and High finding from both. This is well above the median quality bar for a solo-builder project reaching this checkpoint. But 11 distinct issues survived across the four assessment steps, three of which (below) carry real implementation risk if carried into Dev unresolved.

### Critical Issues Requiring Immediate Action

None of the 11 findings are "Critical" on the epic-quality severity scale (no technical-milestone epics, no forward-dependency breaks, no FR coverage gaps). But three **Major** issues should be closed before the epics/stories they touch reach Dev — not because the project can't proceed, but because each has a concrete, already-demonstrated failure mode:

1. **Quiz grading (FR-24, Epic 4/Story 4.4) has no architectural contract**, unlike its sibling Interactive Code Exercise (AD-8). The architecture's own adversarial review already showed the concrete failure: an implementation that grades quizzes client-side would ship the correct answer to the browser, letting any Learner always pass. Close this with a one-line AD-8 extension before Story 4.4 is built.
2. **No dedicated project-scaffold story in Epic 1.** The Next.js/Drizzle/Neon/Vercel/next-intl/shadcn scaffold and CI/preview-branch pipeline (AD-12) are named in Epic 1's description but have no story or acceptance criteria of their own — nothing verifies the scaffold is actually done.
3. **Certificate content (Story 5.1) doesn't specify snapshot-at-issuance vs. live-derived.** An Instructor renaming a course or a Learner changing their display name after certificate issuance could produce two different values for the same certificate across two honestly-built surfaces.

### Recommended Next Steps

1. **Close the 3 Major issues above** — each is a small, targeted edit (one AD extension, one new Story 1.0, one clarifying sentence on AD-7/Story 5.1), not a re-architecture. Do this before Sprint Planning sequences Epic 1 and Epic 4/5 work.
2. **Reconcile the accessibility commitment level** across documents: PRD frames keyboard/screen-reader support as aspirational, `ARCHITECTURE-SPINE.md` explicitly defers to that softer framing, but `EXPERIENCE.md` and the epics' own story ACs (Stories 1.6, 2.3, 3.1, etc.) already encode it as a mandatory, testable floor. Pick one standard and make Architecture state it explicitly — right now Dev Story work would be implementing ACs the Architecture spine doesn't consider load-bearing.
3. **Close two small open decisions:** the PRD's Open Question 10 (Interactive Code Exercise authoring — Architecture/Epics already resolved it as SQL-only via PGlite; the PRD itself should be updated to stop flagging it as an open gap) and the UX/Epics' "Monaco-style" code editor `[ASSUMPTION]` (pick and record the actual library before Epic 2/4 exercise-editor stories reach Dev).
4. **Pick up the cheap Minor-severity fixes** when convenient, no urgency: reword AD-5's ambiguous "single... Route Handler" phrasing, add the missing PRD Open Question 11 entry to Architecture's Deferred list (the practical risk is already closed by Story 3.1's empty-state ACs, but the list should say so), and consider retitling Epic 1 to something more purely user-outcome-framed.
5. Once 1–3 are addressed (4 is optional), proceed to **Sprint Planning** — the underlying requirements → architecture → epics chain is sound enough to build sprints against.

### Final Note

This assessment identified **11 issues across 4 categories** (PRD completeness/traceability, Epic FR coverage, UX↔PRD↔Architecture alignment, and epic/story structural quality) — 0 Critical, 3 Major, and 8 Minor/informational. FR coverage itself is a clean 34/34 (100%), which is the single most important signal for implementation readiness; the issues found are about tightening cross-document consistency and closing a couple of architecture contract gaps, not about missing or contradictory requirements. Address the 3 Major issues before proceeding to implementation; the rest can be fixed opportunistically or accepted as-is at the user's discretion.

---

**Assessed by:** Implementation Readiness workflow (bmad-check-implementation-readiness)
**Date:** 2026-08-02

## Post-Assessment Fixes (2026-08-03)

At Ahmed's request, the 3 Major issues identified above were closed directly in the planning artifacts (not re-run through the full readiness workflow — this is a targeted patch log, not a re-assessment):

1. **Quiz grading contract (Major #1).** Added a `Rule (Quiz grading, FR-24)` clause to `ARCHITECTURE-SPINE.md` AD-8, mirroring AD-8's Interactive Code Exercise contract: `submitQuiz(lessonId, answers) → {pass|fail, score, message}`, evaluated server-side only, correct-answer key never sent to the client. AD-8's Binds/Prevents lines were extended to name FR-24 and the client-side-grading failure mode explicitly. Story 4.4 in `epics.md` gained a matching AC. `epics.md`'s Additional Requirements section was updated to reflect the same.
2. **Project scaffold story (Major #2).** Added **Story 1.0: Project Scaffold & Deployment Pipeline** to `epics.md`, ahead of Story 1.1 — a technical-enabler story (explicitly labeled as such, no end-user persona) with 7 concrete ACs covering the Next.js/Drizzle/Neon/Better Auth/next-intl/DESIGN.md-token scaffold and the AD-12 CI/preview-branch pipeline. Epic 1's description updated to reference it instead of describing the scaffold as ambient, unstoried work.
3. **Certificate content snapshot semantics (Major #3).** Added a `Rule (Certificate content, FR-26)` clause to `ARCHITECTURE-SPINE.md` AD-7, pinning Certificate content as a frozen snapshot copied at issuance time, never re-derived live. Story 5.1 in `epics.md` gained a matching AC (Instructor rename / Learner display-name change after issuance doesn't alter an already-issued Certificate). `epics.md`'s Additional Requirements section updated to match.

`ARCHITECTURE-SPINE.md`'s `updated` frontmatter field was bumped to 2026-08-03 to reflect the edit.

The 4 Minor-severity items were then closed too, same session:

4. **Epic 1's title (Minor #1).** Retitled from "Foundation, Accounts & Bilingual Shell" to **"Accounts & Bilingual Shell"** in both `epics.md` headers (Epic List summary and detailed section) — drops the technical-sounding "Foundation" word; the epic's actual scope (accounts, roles, bilingual shell, plus the now-explicit Story 1.0 scaffold) is unchanged.
5. **Epic/module naming mismatch (Minor #2).** Added a clarifying note directly under `epics.md`'s module ownership map bullet: `Enrollment` is owned by the Learning Experience module per AD-2 but is built in Epic 3 ("Course Discovery & Enrollment") via Story 3.3, not Epic 4 — flagging that epics are journey-organized, not 1:1 with modules, so Sprint Planning doesn't assume otherwise.
6. **AD-5 Route Handler wording (Minor #3).** Reworded in both `ARCHITECTURE-SPINE.md` (canonical) and `epics.md` (summary): "the single upload-initiation Route Handler" → "that media kind's one upload-initiation Route Handler (one for video, one for PDF) — never duplicated per calling UI surface, never re-implemented client-side."
7. **PRD Open Question 11 Deferred entry (Minor #4).** Added the missing entry to `ARCHITECTURE-SPINE.md`'s Deferred list, matching the pattern of every other PRD Open Question — notes the practical risk is already closed by `epics.md` Story 3.1 / UX-DR15's defined empty state, and that no `featured` field exists on Course.

All 11 issues from the original assessment are now closed.
