---
name: 'Review — Data Integrity / Consistency'
type: architecture-review
subject: '../ARCHITECTURE-SPINE.md'
lens: data-integrity-consistency
status: draft
created: '2026-08-02'
---

# Data-Integrity Review — Sanabel Architecture Spine

## Verdict

The spine's ADs correctly identify and close the two biggest data-integrity risks it names explicitly (Course-removal cascade via AD-11, completion-logic drift via AD-7), but it is silent on four related risks that share the same shape — hard FK breaks, duplicate rows, and silent overwrites — that a solo-built v1 under real public traffic will plausibly hit; three of the five are cheap to close with DB-level constraints and small Rule additions, one (Lesson removal from a published course) is a genuine gap worth a tightened AD before launch, and one (autosave silent loss) is a narrow edge case that can reasonably stay deferred with a stated revisit condition.

## Findings

### Finding 1 — AD-11's soft-delete rule doesn't cover Lesson/Module removal from a published Course

**Severity: High**

**The gap.** AD-11's Rule is scoped to "Admin removal of a Course, Comment, or Rating." It says nothing about an *Instructor* removing a Module or Lesson from a Course that is already published and has active Enrollments. FR-15 only speaks to the *addition* case ("newly added Lessons do not retroactively revoke a Certificate") — the PRD never states whether Lesson/Module deletion post-publish is even allowed, and the spine doesn't close that silence.

If Course Authoring's normal Lesson-delete path (used routinely pre-publish) is also reachable post-publish — nothing in AD-2/AD-3 says it isn't — a hard delete of a Lesson row breaks two FKs the ERD depends on:
- `PROGRESS` rows keyed to that `LESSON` (`LESSON ||--o{ PROGRESS`) become either orphaned or must cascade-delete, silently erasing a Learner's recorded completion of that Lesson.
- `COMMENT` rows keyed to that `LESSON` (`LESSON ||--o{ COMMENT`) face the same fate — Comments AD-11 explicitly protects when *Admin* removes them, but not when an Instructor deletes the Lesson they're attached to.

Downstream, `isCourseComplete()` (AD-7) has no defined behavior for "a Learner's Progress references a Lesson that no longer exists" — does it silently drop that Lesson from the denominator (which could *retroactively grant* a Certificate to someone who hadn't earned it under the outline they enrolled against), or does it error? Neither is specified.

This is the same failure mode AD-11 was written to prevent (hard delete breaking a Certificate's guarantee) — it just arrives through the Instructor's own authoring surface instead of Admin moderation, and the spine's current wording doesn't catch it.

**Proposed fix — tighten AD-11.**

Extend AD-11's scope from "Admin removal" to "removal of published structural content," and add an explicit rule for Lessons/Modules:

> **AD-11 (revised) — Moderation & structural-removal contract**
> **Binds:** Moderation, Certificates, Course Authoring — FR-15, FR-32
> **Prevents:** removing a Course cascading into a hard delete of Enrollment/Progress/Certificate rows (as before) — **and** an Instructor deleting a Module/Lesson from an already-published Course silently orphaning Progress/Comment rows or changing what a past Certificate was earned against.
> **Rule:** Admin removal of a Course, Comment, or Rating is always a soft-delete (`removedAt`/status flag), never a hard delete — unchanged. **In addition:** once a Course has any Enrollment, Course Authoring's Lesson/Module delete path becomes a soft-delete (`removedAt`) rather than a hard delete; a soft-removed Lesson/Module is excluded from the *outline shown to new/incomplete Learners* and from `isCourseComplete()`'s current required-set, but existing `Progress` rows referencing it are left untouched (not deleted, not recomputed) so a Learner's history and any already-issued Certificate remain exactly as earned. Pre-Enrollment, Lesson/Module deletion may remain a hard delete (nothing depends on it yet).

This reuses AD-11's existing pattern rather than inventing a new one, and it gives `isCourseComplete()` (AD-7) a defined answer instead of undefined behavior.

---

### Finding 2, 3, 4 — Enrollment, Rating, and Certificate uniqueness are implied by the ERD but not enforced by any AD

**Severity: High (Certificate/Enrollment), Medium (Rating)**

The ERD's cardinality notation (`ENROLLMENT ||--o| CERTIFICATE`, implicitly-singular `RATING` per Learner per Course, implicitly-singular `ENROLLMENT` per Learner per Course) states the *intended* shape, but no AD commits to enforcing it, and none of AD-1 through AD-12 mention a unique constraint or an idempotent create path anywhere. Three concrete risks:

- **Certificate duplication (AD-7 / race condition).** AD-7 defines one canonical `isCourseComplete()`, but says nothing about the issuance transaction. If completion is triggered from a "last lesson completed" event (e.g., two devices/tabs both submit the final quiz within the same window, or one device retries a slow request), both calls can independently observe "course now complete" and both call the Certificate-issuance path. Without a DB-level unique constraint on `Certificate.enrollmentId` and an atomic insert-if-absent, this produces two Certificate rows for one Enrollment — contradicting the ERD's `||--o|` and giving a Learner two (possibly divergent, if generated at slightly different times) certificate files.
- **Duplicate Enrollment.** FR-19 doesn't say enroll is idempotent, and no AD does either. A double-click on "Enroll," a retried request, or two tabs both hitting Enroll produces two `Enrollment` rows for the same `(Account, Course)`. Since `Progress` hangs off `Enrollment` (`ENROLLMENT ||--o{ PROGRESS`), this is worse than cosmetic: Progress recorded in one session could attach to a different Enrollment row than a later session resumes against, silently splitting a Learner's completion state across two rows so neither ever reaches 100% — directly undermining FR-21 ("from any device/session") and FR-25 ("persists indefinitely"), and blocking Certificate issuance entirely for an affected Learner.
- **Rating uniqueness (FR-30).** FR-30 states "once per Course" as a functional requirement, but AD-2's ownership table only says Ratings owns `Rating` — it doesn't state a uniqueness rule, and no other AD does. Without a DB constraint, a retried request or a re-opened rating form silently produces two Rating rows from the same Learner, corrupting the aggregate shown on the Course detail page (FR-31) and directly violating the FR-30 consequence.

**Proposed fix — add a new AD** (small, reuses the same pattern across all three; cheaper than three separate patches):

> **AD-13 — Idempotent-uniqueness contract**
> **Binds:** Learning Experience (Enrollment), Ratings (Rating), Certificates (Certificate) — FR-19, FR-25, FR-26, FR-30
> **Prevents:** a retried request, a double-click, or two concurrent tabs/devices producing two rows where the product model assumes at most one — split Progress across duplicate Enrollments, duplicate Certificates for one Enrollment, or a Learner rating a Course twice.
> **Rule:** each of the following is enforced by a DB-level unique constraint, not just application logic: `Enrollment` on `(accountId, courseId)`; `Rating` on `(accountId, courseId)`; `Certificate` on `enrollmentId`. Each owning module's create path is an atomic upsert (`INSERT ... ON CONFLICT DO NOTHING`/`DO UPDATE`, not check-then-insert): `enroll()` returns the existing Enrollment if one already exists rather than erroring or duplicating; `rate()` updates the Learner's existing Rating if one exists (re-rating replaces the prior score/review) rather than inserting a second row; Certificate issuance is a single atomic "insert if absent" so concurrent completion triggers from two devices converge on one Certificate row, with the loser's request simply returning the winner's already-issued Certificate.

This one AD closes all three gaps with one Rule shape, and it's a two-line migration change (three unique indexes) plus swapping three insert calls for upserts — cheap relative to the corruption it prevents, so this isn't a candidate for Deferred.

---

### Finding 5 — AD-4's "last-write-wins per field-group" narrows blast radius but does not prevent silent loss

**Severity: Low-Medium — acceptable to defer, but recommend a cheap mitigation rather than a full defer**

AD-4 as written is honest about what it does: scoping conflict resolution to a field-group (not the whole document) means a concurrent edit from two tabs/devices of the *same* Instructor can only clobber that one field-group, not the entire Lesson/Module — real, meaningful narrowing of blast radius versus a naive whole-document overwrite. But within that field-group, last-write-wins is still a silent overwrite: if Tab A and Tab B both have the same paragraph field open and both autosave within the debounce window, one Instructor's edit is discarded with no signal to either tab that it happened.

The PRD is explicit that FR-12 is "a reliability requirement, not just a UX nicety" — silent, undetected loss of an edit (even scoped to one field-group) is in tension with that framing, even though the scenario itself (one Instructor, two tabs, same field, same few seconds) is narrow at solo-launch scale where Ahmed is plausibly the only Instructor for a while.

**Proposed fix — tighten AD-4 with a cheap detection+warn, not a full merge system.** Building real concurrent-editing (CRDT/OT) is disproportionate for v1. A much cheaper close: have the save call compare the field-group's `updatedAt` it last loaded against the server's current `updatedAt` before overwriting; on mismatch, still save (last-write-wins, unchanged) but surface a non-blocking client notice ("this section was also edited elsewhere — your change may have overwritten it") so the loss is no longer *silent*, only *narrow*. Suggested addition to AD-4's Rule:

> Each save compares the field-group's last-loaded `updatedAt` against the server's current value; on mismatch the write still proceeds (last-write-wins, unchanged) but the client surfaces a non-blocking conflict notice rather than succeeding silently.

If this is judged not worth the v1 build cost, it's a reasonable **Deferred** item instead — but it should be named explicitly rather than left implicit in AD-4's current wording. Suggested Deferred entry if not tightened now:

> **Concurrent-edit conflict visibility (AD-4)** — last-write-wins per field-group prevents whole-document loss but not silent same-field-group overwrites between two tabs/devices of one Instructor; acceptable at single/few-Instructor launch scale. Revisit if multiple Instructors ever co-edit the same Course, or if Instructor-reported "my edit disappeared" incidents occur.

---

## Minor / bonus observation (not one of the five asked-about areas)

**Certificate content stability isn't explicitly guaranteed, only Certificate *existence*.** AD-11 (and Finding 1's revision) guarantee a Certificate row survives Course/Lesson changes, but the spine doesn't state whether the downloadable file's *content* (Course title, Instructor name — both listed in FR-26's consequences) is a live join computed at download time or a snapshot rendered once at issuance. If it's a live join, an Instructor renaming a Course or changing their display name after a Certificate was issued would silently rewrite the text on a Learner's already-downloaded-in-spirit certificate every time they re-download it — a softer but real version of the same "already-issued Certificate should survive later changes" concern FR-15 raises. Given the Stack table already places "certificate files" in Cloudflare R2 alongside PDFs, the likely intent is render-once-and-store-immutably; recommend making that explicit as one line in AD-11 or AD-7 (e.g., "Certificate PDFs are rendered once at issuance and stored immutably in R2; they are never regenerated from live Course/Account data") so it's a stated invariant rather than an assumption. Low effort, closes a real ambiguity — worth folding into the Finding 1 edit rather than treating as its own AD.
