---
title: Review — ARCHITECTURE-SPINE.md (Sanabel)
reviewer: rubric-walker
reviewed: '2026-08-02'
target: ../ARCHITECTURE-SPINE.md
inputs:
  - ../../../prds/prd-BMAD Test-2026-07-30/prd.md
  - ../../../prds/prd-BMAD Test-2026-07-30/addendum.md
  - ../../../ux-designs/ux-BMAD Test-2026-08-02/DESIGN.md
---

# Review: Sanabel Architecture Spine

## Verdict

Structurally sound and unusually disciplined for a solo-builder spine — twelve ADs each pass the "would two independently-built epics diverge?" test, the diagrams are valid and load-bearing, and the Deferred list is mostly honest — but it ships one Critical contradiction (a content-language field the UX design has already committed to, which the spine simultaneously declares undecided) plus a couple of real gaps that would let two epics quietly disagree.

## Findings

### Critical

**C-1. The Deferred list punts a decision the UX design has already made.**
- **What's wrong:** `Deferred` says: *"Per-course content-language tag/filter (PRD Open Question 3) — Course content language is currently implicit... no filter/tag field designed."* But `DESIGN.md`'s Badge component spec (status: final) explicitly requires this field to exist and render on every course card: *"Used for the course-language tag ('Taught in: Arabic' / 'Taught in: English')... "* and the `course-card` component token block lists a `languageBadge` slot as a standard part of every card. The UX layer isn't speculating — it's specified as a shipped v1 surface.
- **Why it matters:** This is exactly the "load-bearing decision hiding in Deferred" the checklist warns about. If Course Authoring's epic and Discovery's epic each build independently against a spine that says "no field designed," one will invent a `language` column (and infer values, or block publish on it) while the other renders the badge assuming it always exists — or worse, Discovery ships without the badge because the spine told it the field doesn't exist yet, breaking a UX surface DESIGN.md already treats as final.
- **Suggested fix:** Split the Deferred item into two: (a) a single-value `Course.contentLanguage` enum field, decided *now* — Course Authoring sets it (required at publish, alongside FR-14's Category), Discovery/course-card reads it for the badge, no filter/search behavior implied. This is a one-line AD, not a redesign. (b) Keep genuinely deferred: filtering/searching Discovery by content language (PRD Open Question 3's actual open half). Add an AD (or fold into AD-9) stating the field is single-select, Instructor-set, display-only in v1.

### High

**H-1. AD-7 doesn't say whether Certificate issuance is a persisted fact or a live recomputation — leaving FR-15's own guarantee unenforced.**
- **What's wrong:** AD-7 gives one canonical `isCourseComplete()` and a `required` boolean per Lesson/Quiz/Exercise, which correctly resolves PRD Open Question 6. But FR-15's testable consequence is explicit: *"A Learner who already earned a Certificate keeps it; newly added Lessons do not retroactively revoke a Certificate already issued."* Nothing in AD-7 (or anywhere else) states that Certificate issuance is a one-time, persisted grant rather than something re-derived from `isCourseComplete()` on every view. If Certificates module built completion-status display by re-running `isCourseComplete()` against a course that later gained a new required Lesson, a previously-certified Learner would appear "incomplete" again — silently violating FR-15.
- **Why it matters:** This is precisely the two-epics-diverge scenario the spine exists to prevent: Learning Experience (which legitimately wants live recomputation for the progress bar) and Certificates (which needs a frozen point-in-time fact) could each reasonably assume the other's semantics without an explicit rule forcing the distinction.
- **Suggested fix:** Add one sentence to AD-7: "Certificate issuance is a one-time event — once a Certificate row exists for an Enrollment, its validity is never re-derived from a later `isCourseComplete()` recomputation, per FR-15." Cheap, closes the gap.

**H-2. Accessibility (PRD §7 NFR) is completely absent from the spine — no AD, no Consistency Convention, not even a Deferred entry.**
- **What's wrong:** The PRD names accessibility as a cross-cutting NFR ("usable with screen readers and keyboard navigation where feasible... aspirational, not a v1 gate"), and DESIGN.md goes further, committing to concrete WCAG AA contrast ratios as "the concrete floor behind Sanabel's accessibility posture." The spine says nothing about this dimension anywhere — not as a rule, not as a convention, not even as an explicit "out of scope, revisit if X" the way Observability got one.
- **Why it matters:** This is a genuine cross-cutting dimension (checklist item 5) left silent rather than decided/deferred/flagged. Without even a baseline statement ("shadcn primitives + semantic HTML/keyboard nav is the v1 floor, no additional a11y process"), one epic's forms/dialogs might be keyboard-navigable and another's might not, with no shared contract to point to — and DESIGN.md's AA contrast commitment has no architectural home confirming it's enforced anywhere (e.g., in a lint rule, a design-token check, or just "trust the token values").
- **Suggested fix:** Add a short line to Consistency Conventions or a new minimal AD: "Accessibility floor for v1 is whatever shadcn/ui primitives provide out of the box (semantic HTML, keyboard nav, focus states) plus DESIGN.md's AA contrast token values; no additional WCAG audit process, screen-reader QA pass, or captioning is in scope — matches PRD §7." This costs three lines and removes the silence.

### Medium

**M-1. AD-10's canonical access-gate function doesn't explicitly bind Ratings, even though FR-30 has its own enrollment gate and the dependency diagram already implies it should.**
- **What's wrong:** AD-10's `Binds` line lists "Discovery, Course Authoring (visibility field), Learning Experience (enrollment gate)" only. But FR-30 states ratings require Enrollment ("A Learner enrolled in a Course can leave a... Rating"), and the AD-3 module dependency diagram already shows `Ratings --> LearningExperience`, implying Ratings needs to check enrollment status somehow. AD-10 is exactly the mechanism that should serve that check ("one shared function is the single source of truth"), but as written it doesn't say Ratings must call it, and FR-28 (Comments) explicitly has *no* enrollment requirement — so the two discussion-adjacent modules have genuinely different gating rules that the spine doesn't distinguish anywhere.
- **Why it matters:** Without an explicit rule, the Ratings epic could write its own ad hoc `enrollment exists` query instead of reusing the canonical function — the exact "surface re-derives this gate independently" failure AD-10 exists to prevent, just one module short of full coverage.
- **Suggested fix:** Extend AD-10's Binds/Rule one clause: "Ratings' enrollment requirement (FR-30) is checked via the same canonical function family, not a separate query; Comments (FR-28) intentionally has no enrollment gate — any signed-in Learner may comment."

### Low

**L-1. Stack table's verification rigor is inconsistent across rows.**
- **What's wrong:** Next.js 16 and `@react-pdf/renderer`'s Arabic-bidi fidelity both get explicit `[ASSUMPTION]` tags with concrete fallback plans — good practice per checklist item 4. Drizzle ORM and Better Auth are both pinned only as "latest stable" with no equivalent note on how currency gets verified at build time (vs. just trusting the label). Not a correctness problem today, just an inconsistency in how much verification rigor different rows show.
- **Why it matters:** Minor — doesn't block epic-level work, but an epic builder can't tell from the spine alone whether "latest stable" was actually checked or is a placeholder phrase.
- **Suggested fix:** Either apply the same `[ASSUMPTION]`/verification-note treatment uniformly, or add one line noting "'latest stable' entries are checked at implementation start, not pinned here by design" so the inconsistency reads as intentional.

**L-2. Course/content search implementation (FR-17) is left completely unaddressed.**
- **What's wrong:** FR-17 requires search matching against title/description/category; the spine names no search approach (Postgres full-text/trigram vs. simple `ILIKE`) anywhere, not even in Deferred.
- **Why it matters:** Likely fine to leave silent — search is arguably internal to the Discovery module's read path (AD-3 already forces it through Course Authoring's exported service function), so two epics can't diverge on *how* search works without also violating AD-3. Flagged only because checklist item 5 asks to check systematically against the full FR list; this is the one FR with zero architectural mention, even though the risk of actual divergence is low.
- **Suggested fix (or defer condition):** No action needed unless search becomes performance-sensitive; if so, revisit and add an AD pinning the indexing strategy (e.g., Postgres `tsvector` column) once Course volume is large enough to matter.

## Not Findings (checked, no issue)

- All 12 ADs pass the "could two independently-built epics choose incompatibly" test; none read as unnecessary or merely descriptive.
- All four Mermaid diagrams (module dependency graph, AD-8 sequence diagram, structural-seed component graph, ER diagram) are syntactically valid and convey real structure, not placeholders.
- Deployment/environments (AD-12), module boundaries (AD-2/AD-3), auth model (AD-6 + Better Auth), and data model (ER diagram + ownership table) are all explicitly decided — none of the "whole dimension left silent" failure mode applies to these.
- Remaining Deferred items (multi-language code exercises, verifiable certificates, pre-publish review queue, CAPTCHA/rate-limiting, account deletion, threaded comments, captions) were checked against current v1 scope and none are load-bearing today — each is genuinely un-needed until a feature that depends on it gets built.
- The spine stays terse throughout; the Design Paradigm prose paragraph is the only non-tabular rationale block and is proportionate to the one deliberate-tradeoff explanation it needs to carry.
