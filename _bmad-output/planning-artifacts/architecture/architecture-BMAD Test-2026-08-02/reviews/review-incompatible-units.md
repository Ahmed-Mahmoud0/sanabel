---
title: Adversarial Review — Incompatible Units Under ARCHITECTURE-SPINE.md
type: architecture-review
target: ../ARCHITECTURE-SPINE.md
created: 2026-08-02
---

# Adversarial Review: Can Two Compliant Units Still Build Incompatibly?

## Method

For each finding below I construct two concrete builder sessions ("Session A" / "Session B") who each read only `ARCHITECTURE-SPINE.md` (and the PRD), never see each other's code, and each write code that satisfies every AD they believe applies — then show the two outputs are incompatible. Where the incompatibility stems from a genuine hole in the spine, I propose exact AD text (Binds/Prevents/Rule) or a Consistency Convention addition to close it.

Severity scale: **Critical** (system breaks or data is silently wrong/lost), **High** (a shipped feature visibly contradicts another, or a cross-module call is architecturally impossible as specified), **Medium** (real divergence risk, workable but will require late rework), **Low** (worth pinning, low blast radius).

---

## Finding 1 — CRITICAL: AD-3's dependency graph is missing edges the FRs require

**The claim:** AD-3's mermaid graph is presented as the exhaustive, authoritative map of which module may call which. Three modules need data the graph does not grant them a path to:

- **Certificates has no edge to Accounts.** FR-26: "Certificate includes Learner name, Course title, Instructor name, and completion date." Course title comes via the existing `Certificates --> CourseAuthoring` edge, but Learner display name and Instructor display name are Accounts data (FR-5: "Every user has a display name"), owned exclusively by Accounts per AD-2. The graph shows no `Certificates --> Accounts` edge.
- **Discussion has no edge to LearningExperience.** FR-29: comments are "visible to any enrolled Learner and the Course's Instructor" — an enrollment check gates comment *visibility*, and Enrollment is owned exclusively by Learning Experience per AD-2. The graph shows `Discussion --> Accounts` and `Discussion --> CourseAuthoring` only.
- **Discovery has no edge to Accounts.** FR-18: the Course detail page renders "Instructor name/bio" (bio is Accounts data per FR-5). The graph shows `Discovery --> CourseAuthoring` and `Discovery --> Ratings` only.

**Concrete incompatible-build scenario:** Session A builds Certificates strictly off the graph. Reading no permitted edge to Accounts, it takes the only AD-3-compliant path it can see: it denormalizes `learnerDisplayName`/`instructorDisplayName` onto the Certificate row at issuance by having Course Authoring's or Learning Experience's service functions pass names through (since those modules *do* have edges to Accounts). Session B, building Discussion, reasons the same way about visibility: since there is no permitted edge to Learning Experience, and AD-3 forbids raw cross-module queries, it concludes enrollment-gating is out of scope for Discussion's Server Actions and implements FR-29's restriction only as a UI-level filter (hide the comment composer/list from non-enrolled users client-side) — leaving the actual read Server Action ungated, so any signed-in Learner can fetch a Course's comments by calling the action directly. Both sessions followed AD-3 to the letter ("never a raw Drizzle query against another module's schema"); the graph itself steered them into two different flavors of wrong: one workaround-denormalization, one an unenforced authorization gate.

**Fix — extend AD-3's diagram and add a Rule clause:**

```
Certificates --> Accounts
Discussion --> LearningExperience
Discovery --> Accounts
```

Add to AD-3's Rule: "The dependency graph above is exhaustive — if a module's UI or FR requires data it has no edge to, that is a spine bug to fix (add the edge), never license to denormalize the data locally or query the owning table directly."

---

## Finding 2 — CRITICAL/HIGH: AD-7 contradicts AD-2's own data model, and quiz/exercise attempt data has no owner

**The claim:** AD-7's Rule reads: *"Every Lesson/Quiz/Exercise row carries a `required: boolean`..."* — treating Lesson, Quiz, and Exercise as three separate row-owning entities. But AD-2's ownership table and the structural ER diagram model exactly one entity, `LESSON`, and FR-9's own consequence is explicit: *"Each Lesson has exactly one Lesson Type"* (Video | Text | PDF | Quiz | Interactive Code Exercise) — i.e., Quiz and Exercise are a `lessonType` enum value on the Lesson row, not their own tables.

Compounding this, AD-2's ownership table has **no entity at all** for: quiz questions/choices, a learner's quiz attempt/score, or an exercise submission history. `Progress` (owned by Learning Experience) is the only per-learner state entity named, and its shape isn't specified beyond "which Lessons are complete... last-viewed position."

**Concrete incompatible-build scenario:** Session A builds Course Authoring's quiz editor and Learning Experience's `isCourseComplete()` reading AD-2 literally: `required` is one column on `Lesson`, and a learner's quiz result is just `Progress.completed` (boolean) — no score, no per-question history, satisfying FR-24's "auto-grade... return immediate feedback" without persisting more than pass/fail. Session B, building FR-16 Instructor analytics ("Per Lesson, the Instructor sees at least a view count and a completion count") and later a hypothetical retake feature, reads AD-7's literal "Quiz... row" language and instead creates a new `quizAttempt` table (which module owns it — Course Authoring, since quizzes are "content," or Learning Experience, since attempts are learner state?) with its own `required` flag independent of the parent Lesson's. Now two incompatible schemas exist for the same conceptual entity, and worse, a `required` flag can disagree between the Lesson row and the (Session-B-invented) QuizAttempt row for the same quiz.

**Fix:**
1. Correct AD-7's Rule text to match AD-2's actual model: *"Every Lesson row (whatever its `lessonType`) carries a `required: boolean` (default `true`)..."* — delete "/Quiz/Exercise", it's the same row.
2. Add a new row to AD-2's ownership table: `Learning Experience | Enrollment, Progress, QuizAttempt/ExerciseSubmission (per-attempt grading history), completion computation` — explicitly assigning ownership of graded-attempt history to Learning Experience, not Course Authoring, since it's per-learner state, consistent with Progress.
3. Add one sentence to AD-7 pinning the minimum shape: *"A QuizAttempt/ExerciseSubmission row records `{lessonId, accountId, passed: boolean, submittedAt}` at minimum; `isLessonComplete()` derives from the latest such row, never from a separately-tracked boolean elsewhere."*

---

## Finding 3 — HIGH: AD-4's field-group granularity and its optimistic-concurrency mechanism contradict each other

**The claim:** AD-4's Rule does two things that don't compose:
- Mandates save granularity of "one call per outline-node or content field-group," but never enumerates what a "field-group" is for any of the five Lesson Types. Is a Text lesson's body one field-group, or is title separate from body? Is each Quiz question its own field-group, or the whole question array?
- Mandates the optimistic-concurrency check operate on "Each Module/Lesson **row**'s `updatedAt`" (row granularity) while simultaneously mandating conflict resolution "last-write-wins **per field-group**" (sub-row granularity). A single row-level `updatedAt` cannot correctly arbitrate two concurrent writes to two *different, non-overlapping* field-groups on the same Lesson — the second save's optimistic check will see a stale `updatedAt` (bumped by the first save) and either spuriously reject/retry a non-conflicting write, or (if the builder decides row-level staleness is only a "warning," not a rejection) silently drop the distinction the Rule promised.

**Concrete incompatible-build scenario:** Session A builds the outline editor treating "field-group" as coarse (whole Lesson content = one field-group, matching how outline nodes are already saved wholesale) and implements a straightforward row-level optimistic lock: reject a save if the row's `updatedAt` moved since the editor loaded it. Session B builds the rich-text lesson-content editor months later, reads "not one call for the whole course" and "last-write-wins per field-group" and interprets field-group as fine-grained (title vs. body vs. code-block-language are separate field-groups, each autosaved independently), and — needing sub-row optimism to avoid the row-level lock rejecting unrelated concurrent field saves — adds a *second*, undocumented mechanism: per-field-group hash/timestamp columns that AD-4 never mentioned. The two editors, both touching the same Lesson row, now disagree about what "conflict" means and use incompatible version-check columns; a user with the outline editor and content editor open in two tabs can lose data exactly the way AD-4 exists to prevent.

**Fix — tighten AD-4's Rule:**

Add: *"A field-group is fixed per Lesson Type: {title, lessonType} is one field-group; for Text lessons the rendered body is one field-group; for Quiz lessons each question (prompt+choices+correctAnswer) is one field-group and the question-order array is a separate field-group; for Video/PDF lessons the media reference is one field-group (see AD-5); for Interactive Code Exercise lessons the dataset/setup script is one field-group and the solution/grading query is a separate field-group. Optimistic concurrency is checked and stored per field-group (a JSON map of `{fieldGroupKey: updatedAt}` on the Lesson row, not a single row-level `updatedAt`); a conflict is only flagged when two writes target the *same* field-group key."*

---

## Finding 4 — HIGH: Named cross-cutting helpers have no pinned signature, and role checks may read stale session state

**The claim:** Three helpers are referenced by name only — `requireRole()`/`can()` (AD-6), `isLessonComplete()`/`isCourseComplete()` (AD-7), `canQueryCourse()`/`canAccessLesson()` (AD-10). None has a pinned signature (sync/async, params, return type — throw vs. discriminated-union return, given the Consistency Conventions require Server Actions to *return* `{ok:false, error}` rather than throw across the client boundary — does `requireRole()` throw internally and get caught by a wrapper, or return a boolean the caller must branch on?).

Two sharper sub-issues:
- **Role hierarchy ambiguity.** AD-6 says roles are "additive role flags on one Account row" (not a hierarchy) — Ahmed's Admin account is explicitly said to also hold Learner/Instructor per the PRD (§3 Glossary: "Every Instructor is also a Learner"), but nothing states that granting Admin *implies* setting the Instructor flag, nor that `requireRole('instructor')` treats an Admin-flagged-but-not-explicitly-Instructor-flagged account as passing. A Certificates-module builder gating an Instructor-only analytics view might write `requireRole('instructor')` expecting Admins to pass transparently (common "admin can do everything" assumption); a Moderation-module builder, reading AD-6's literal "additive flags, never separate entities" as "check exactly the flag asked for," might explicitly write `requireRole('instructor') || requireRole('admin')` at every instructor-gated call site instead. If Ahmed's seed Admin account is never given an explicit Instructor flag, the first builder's surfaces silently 403 Ahmed; the second builder's don't. Nothing in the spine says which is correct.
- **Session staleness on revoke.** FR-4: Admin can revoke Instructor status. AD-6 says "the Better Auth session carries role claims." Nothing states whether `requireRole()` re-reads the DB on every call or trusts the session's cached claim, nor whether revocation invalidates existing sessions. A builder of the revoke action and a builder of `requireRole()` can each reasonably assume the other side handles freshness — the result being a revoked Instructor who keeps authoring access until their session/token happens to expire.

**Fix — add signature + freshness text to AD-6, and a companion note to AD-7/AD-10:**

Add to AD-6's Rule: *"`requireRole(...roles: Role[])` is async, always re-reads the account's current role flags from Postgres (never trusts a cached session claim), and throws a typed `AuthError` that every Server Action's outer wrapper catches and converts to `{ok:false, error:{code:'FORBIDDEN',...}}` — no module calls it and branches on a return value instead. `can(action, subject)` is deferred until a second authorization axis beyond role exists; v1 uses `requireRole()` exclusively. Admin implicitly satisfies every `requireRole('instructor'|'learner')` check without the Instructor flag needing to be separately set — Admin is the ceiling of the additive set. A role revoke (FR-4) takes effect on the very next request, not next login, as a direct consequence of the no-caching rule above."*

Add one line to AD-7 and AD-10 each: *"Signature: `isCourseComplete(accountId, courseId): Promise<boolean>`; `canAccessLesson(accountId, lessonId): Promise<boolean>` — both async, both re-derive from current DB state, never memoized across requests."* (Pin the others analogously.)

---

## Finding 5 — HIGH: AD-10 and AD-11 never cross-reference each other; AD-11's soft-delete scope stops at Admin moderation and leaves ordinary content edits unaddressed

**5a. Soft-deleted courses aren't wired into the access-gate contract.** AD-10's Rule lists exactly one input to `canQueryCourse()`: Visibility (Public/Unlisted). AD-11 separately establishes that Admin-removed Courses are soft-deleted (`removedAt` set, row still present). Nothing states that `canQueryCourse()`/`canAccessLesson()` must also check `removedAt`. A Discovery builder implementing AD-10 exactly as written (`WHERE visibility = 'public'`) ships a browse page that still lists Admin-removed courses, because removal was never named as one of the gate's inputs.

**Fix:** append to AD-10's Rule: *"`canQueryCourse()`/`canAccessLesson()` also exclude any Course, Module, or Lesson with `removedAt` set (AD-11) — moderation removal and visibility are the same gate, not two separate checks a caller must remember to AND together."*

**5b. AD-11 only Binds Moderation-initiated deletes, but FR-15's "post-publish content changes" is a routine Instructor action that can delete a Lesson too, with no soft-delete requirement placed on it.** FR-15 guarantees an already-issued Certificate survives later Course changes, and a currently-enrolled Learner's Progress must keep working as content changes. If an Instructor deletes a Lesson from the outline (ordinary editing, not moderation) and Course Authoring implements this as a plain hard `DELETE`, any `Progress` row referencing that `lessonId` (owned by Learning Experience) either orphans or (if a real FK constraint exists) blocks the delete outright — and `isCourseComplete()`'s "required lessons" computation for a Learner who already completed the course, including that lesson, loses its input data.

**Concrete incompatible-build scenario:** Session A builds Course Authoring's outline editor with a normal hard-delete on "remove lesson," since AD-11's Rule ("Admin removal of a Course, Comment, or Rating is always a soft-delete") textually binds Admin actions on Course/Comment/Rating — Lesson isn't even in that list, and the Instructor isn't the Admin. Session B builds Learning Experience/Certificates assuming, per AD-11's spirit and per FR-15's guarantee, that nothing referenced by Progress or a Certificate is ever actually destroyed. Session B never defensive-codes against a missing Lesson row. The hard-delete ships, and the first Instructor who deletes a lesson after any learner has progress on it either 500s (FK violation) or silently corrupts a completed learner's certificate-eligibility recomputation.

**Fix — extend AD-11's Binds and Rule:**

*Binds:* add "Learning Experience (Progress FK safety)" and change scope from "Course, Comment, or Rating" to "Course, Module, Lesson, Comment, or Rating."

*Rule:* append: *"This applies equally to Instructor-initiated deletes in the course builder (FR-15), not only Admin moderation: Course Authoring's delete-Module/delete-Lesson Server Action always soft-deletes (never hard-deletes) once at least one Progress or Certificate row references it; a Module/Lesson with zero references may hard-delete freely."*

---

## Finding 6 — MEDIUM-HIGH: Certificate content — snapshot-at-issuance vs. live-derived — is unspecified

FR-26 requires the Certificate to include Learner name, Course title, Instructor name, completion date. FR-15 guarantees an issued Certificate "survives later Course changes." Nothing states whether the Certificate's *displayed content* is frozen at issuance (a snapshot stored on the Certificate row, baked into the rendered PDF once) or re-derived live from current Account/Course data every time it's viewed/re-downloaded.

**Concrete incompatible-build scenario:** Session A (Certificates module) implements "generate PDF once at issuance, store the file in R2, serve that exact file on every future download" — title/instructor-name changes after issuance never touch already-issued certificates. Session B, building a "my certificates" list page as a lighter-weight follow-on feature, queries live Course/Account data to render an in-app certificate summary card (not the PDF) for each earned Certificate — because nothing told them the data must be frozen, and live-joining is the natural default for a read view. Now an Instructor who renames their Course after some learners finish it produces two different titles for the *same* certificate depending on which surface a Learner is looking at.

**Fix — new sentence appended to AD-7 (or a new short AD-13):** *"Certificate content is a snapshot: `learnerName`, `courseTitle`, `instructorName`, `completionDate` are copied onto the Certificate row at issuance time and never re-derived from live Account/Course data by any surface — the in-app certificate view and the downloadable PDF both read the Certificate row's own frozen columns, not a live join."*

---

## Finding 7 — MEDIUM: Timezone convention for the Certificate's "completion date" (a date-only field derived from a `timestamptz`) is unspecified

The Consistency Conventions pin `timestamptz`/UTC for storage, but say nothing about which timezone a *date-only* display value (FR-26's "completion date") is formatted in. A learner who completes a course near midnight UTC can see two different calendar dates depending on whether a given surface formats in UTC or in the viewer's browser-local timezone.

**Concrete incompatible-build scenario:** Session A (PDF generation, server-rendered, no browser context available) formats the completion date in UTC by necessity. Session B (a hypothetical "Congratulations!" on-screen completion modal, or a future certificate-list page) formats `progress.completedAt` using the browser's local timezone via `Intl.DateTimeFormat`, the default idiom for client components. A learner in Riyadh (UTC+3) who finishes at 11:30 PM local sees one date on-screen and a different date on the PDF.

**Fix — add to Consistency Conventions table:** *"Any date-only rendering derived from a `timestamptz` (e.g., Certificate completion date) is formatted in UTC on every surface, never the viewer's local timezone — consistency between the PDF and any on-screen display of the same event takes priority over local-time friendliness for this one field."*

---

## Finding 8 — MEDIUM: Quiz grading (FR-24) has zero architectural coverage, unlike its sibling graded Lesson Type

AD-8 pins one precise contract — `submit(exerciseId, code) → {pass|fail, message}` — for Interactive Code Exercises only. Quizzes (FR-24, FR-9) are graded, feed the same `isCourseComplete()` computation (AD-7), and are just as cross-cutting (Course Authoring authors quiz content; Learning Experience grades and stores results), yet no AD Binds or constrains Quiz submission at all.

**Concrete incompatible-build scenario:** Session A, building the Interactive Exercise flow, follows AD-8's sequence diagram exactly: a Server Action `submit()`. Session B, building Quiz grading with no analogous AD to anchor to, treats it as "just form validation" and grades multiple-choice answers **client-side in the browser** (compare selected option to a `correctAnswer` field shipped to the client in the lesson payload), then POSTs only the final pass/fail to a Route Handler to update Progress. This is a real, silent instructor-facing security/integrity hole (any learner can read `correctAnswer` out of the page's JS bundle/network tab and always "pass"), and it happened even though Session B never violated a single lettered AD — because none exists for this case.

**Fix — extend AD-8's Binds and Rule (or add AD-8b):** *"Binds: ...and Quiz grading (FR-24). Quiz grading follows the identical contract shape: `submitQuiz(lessonId, answers) → {pass|fail, score, message}`, evaluated server-side inside the Server Action — the correct-answer key is never sent to the client. Quiz attempts are persisted the same way Exercise submissions are (Finding 2's `QuizAttempt`/`ExerciseSubmission`, owned by Learning Experience)."*

---

## Finding 9 — MEDIUM: PRD Open Question 11 (thin/empty Browse and any "Featured" concept) has no AD and, unlike every other open PRD question, no Deferred entry either

The spine's `Deferred` section is otherwise disciplined about listing every PRD Open Question it isn't resolving (OQ-1, OQ-2, OQ-3, OQ-7, OQ-8, OQ-9, OQ-10 all have explicit Deferred entries). OQ-11 — "What does Browse/Search show when there are few or zero Public Courses, given Instructor growth is admin-gated and could plausibly launch thin?" — has none. This makes it invisible rather than explicitly out-of-scope, which is exactly the condition under which two builders silently invent different answers.

**Concrete incompatible-build scenario:** Session A builds Browse to just render whatever `listCourses()` returns, including an empty grid with no messaging, when there are zero Public courses at launch. Session B, working the Discovery module later (or a redesign pass), decides an empty state needs *something* to not look broken, and ships a "Featured Courses" hand-picked carousel — which requires a `featured: boolean` column. That column has no owner in AD-2 (is it Course Authoring's, set by the Instructor? Or Moderation's, set by the Admin, since it's editorial curation?) and no AD authorizes its existence at all.

**Fix — minimal, cheap to add now:**

Add to Deferred: *"**Featured/curated course listing and thin-catalog empty state** (PRD Open Question 11) — v1 Discovery renders only real query results; an empty Browse/Search result set shows a fixed empty-state message, never a hand-curated substitute list. No `featured` field exists on Course; introducing one is a future design decision requiring an ownership call (Instructor self-nomination vs. Admin curation via Moderation) not made here."*

---

## Finding 10 — MEDIUM: Enrollment idempotency is unspecified

AD-2 assigns `Enrollment` to Learning Experience but no AD requires a uniqueness constraint on `(accountId, courseId)`, nor defines what the enroll Server Action does on a duplicate call (double-click, back-button resubmit, or a future deep-link "enroll me automatically" flow interacting with an already-enrolled account).

**Concrete incompatible-build scenario:** Session A implements enroll as `INSERT ... ON CONFLICT DO NOTHING`-style idempotent upsert, returning the existing Enrollment on a repeat call. Session B, building a different entry point (e.g., a "one-click enroll from email digest" link, if ever added, or simply a second, independently-written enroll Server Action because the first wasn't discovered/reused), implements a plain `INSERT`, which either throws on the DB unique constraint (if Session A's constraint exists) with an unhandled 500, or — if no constraint exists at all — creates a second `Enrollment` row, which then makes "one Enrollment per Learner per Course" (an assumption baked into Progress, Certificate-eligibility, and Rating's "once per Course" rule, FR-30) silently false.

**Fix — add to AD-2's Rule (or a short addition to AD-2's table row for Learning Experience):** *"`Enrollment` carries a unique constraint on `(accountId, courseId)`. The enroll Server Action is idempotent: re-enrolling an already-enrolled Learner returns the existing Enrollment as a success, never a duplicate row or a thrown error."*

---

## Finding 11 — LOW/MEDIUM: AD-5's "single... Route Handler" (singular) is ambiguous between "one handler total" and "one handler per media kind"

AD-5's Rule says upload caps are enforced "server-side, once, at the single upload-initiation Route Handler" (singular, no article distinguishing video from PDF). The structural seed's own comment on `app/api/` says "webhook + upload Route Handlers (Cloudflare Stream webhook, PDF upload)" — plural, implying at least two handlers already. A builder could read AD-5 as mandating literally one shared `/api/upload` endpoint branching on media type internally (a single call site to instrument for cap-checking); another could read it as "one per kind, not duplicated per calling surface" and build `/api/upload/video` and `/api/upload/pdf` separately. Functionally similar outcomes either way, but it invites two different builders to each claim the other's structure violates "the single... Route Handler."

**Fix — reword AD-5's Rule:** replace "the single upload-initiation Route Handler" with *"that media kind's one upload-initiation Route Handler (one for video, one for PDF) — never duplicated per calling UI surface, and never re-implemented client-side."*

---

## Finding 12 — LOW/MEDIUM: AD-8 pins the `submit()` call shape but not the exercise-dataset/expected-output data shape it operates over, nor which module owns the `code-execution` directory

AD-8's Binds line names Course Authoring (exercise-definition schema) and Learning Experience (submission/grading flow) as the two consumers, and the structural seed lists `lib/modules/code-execution/` as its own directory — but AD-2's ownership table never assigns an owner to it, and no AD states what shape `exercise.dataset` (referenced only implicitly via the sequence diagram's `execute(exercise.dataset, code)`) actually is: a raw SQL setup script? A structured `{tables:[{name,columns,rows}]}` JSON document? Similarly, "explanatory hint on failure" (FR-23) — is the hint text authored per-exercise by the Instructor, or generated by diffing expected vs. actual result sets?

**Concrete incompatible-build scenario:** Session A (Course Authoring's exercise editor) builds the dataset field as one free-text SQL script (DDL+DML) — the natural authoring UX for an Instructor who already knows SQL. Session B (the Code Execution Service adapter under `lib/modules/code-execution/`) is written first, before the editor exists, and assumes a structured JSON table-definition format because that's easier to validate/sandbox safely. Neither read the other's assumption anywhere in the spine; integration breaks at the first real exercise.

**Fix — add to AD-8's Rule:** *"An exercise's dataset is authored and stored as one SQL setup script (DDL+DML) on the Lesson row (Course Authoring owns this field); the exercise also stores one 'solution query' (also Instructor-authored SQL) whose result set the Code Execution Service diffs row-for-row, order-sensitive, against the learner's submission to produce pass/fail. The failure `message` is generated by the diff (e.g., naming the first mismatched row/column), not separately authored by the Instructor — v1 does not support per-exercise custom hint text. The `code-execution` module itself is owned by no domain module; it exposes only the `submit()` contract and is called exclusively by Learning Experience, never directly by Course Authoring."*

---

## Finding 13 — LOW: Full-text search behavior across mixed English/Arabic content is unaddressed

AD-9 correctly defers per-course content-language tagging, and that's listed in Deferred. But FR-17's "search matches against Course title, one-line description, and Category" doesn't say whether search uses simple substring (`ILIKE`) or Postgres `tsvector` full-text search — and if the latter, which language config (`simple` vs `arabic` text search dictionary) applies to a title that may be in either language, or mixed. Low blast radius (degrades to "search is a bit worse than expected," not incompatible data), but two search-feature builders (initial Browse+Search vs. a later search-quality pass) could pick incompatible indexing strategies requiring a migration to reconcile.

**Fix — one-line addition to AD-9 or Deferred:** *"v1 Course search uses case-insensitive substring matching (`ILIKE`) against title/description/category, not language-aware full-text indexing — acceptable given expected launch-scale catalog size; a `tsvector`-based upgrade is future work, not decided here."*

---

## Summary Table

| # | Finding | Severity | AD(s) touched |
|---|---|---|---|
| 1 | Dependency graph missing Certificates→Accounts, Discussion→LearningExperience, Discovery→Accounts | Critical | AD-3 |
| 2 | AD-7 "Lesson/Quiz/Exercise" contradicts AD-2's one-Lesson-row model; quiz/exercise attempt data unowned | Critical/High | AD-2, AD-7 |
| 3 | AD-4 field-group granularity undefined; row-level vs field-group-level concurrency contradiction | High | AD-4 |
| 4 | Helper signatures unpinned (`requireRole`, `can`, `isCourseComplete`, `canAccessLesson`); role-hierarchy and session-staleness on revoke unaddressed | High | AD-6, AD-7, AD-10 |
| 5 | AD-10 doesn't fold in AD-11's soft-delete state; AD-11 doesn't cover Instructor-initiated Lesson deletion vs Progress/Certificate integrity | High | AD-10, AD-11 |
| 6 | Certificate content: snapshot-at-issuance vs. live-derived unspecified | Medium-High | AD-7 (or new AD-13) |
| 7 | Timezone convention for date-only fields (Certificate completion date) unspecified | Medium | Consistency Conventions |
| 8 | Quiz grading (FR-24) has no architectural contract, unlike Interactive Code Exercises | Medium | AD-8 |
| 9 | PRD Open Question 11 (thin catalog / Featured) has no AD and no Deferred entry, unlike every other Open Question | Medium | Deferred |
| 10 | Enrollment idempotency/uniqueness unspecified | Medium | AD-2 |
| 11 | AD-5 "single...Route Handler" ambiguous (one total vs. one per media kind) | Low-Medium | AD-5 |
| 12 | AD-8's `submit()` contract doesn't pin `exercise.dataset` shape or hint-text source; `code-execution` module ownership unstated | Low-Medium | AD-2, AD-8 |
| 13 | Search indexing strategy for mixed EN/AR content unaddressed | Low | AD-9 |

## Overall Verdict

The spine's twelve ADs are well-chosen as *topics* — every major cross-cutting risk category the PRD implies (auth, upload, autosave, completion, grading, i18n, visibility, moderation, environments) has an AD. But roughly half of them leave enough slack in *wording* or *scope boundary* that two compliant builders would still diverge, and the AD-3 dependency graph — the one artifact meant to be mechanically checkable — is demonstrably incomplete against the FRs it's supposed to serve. The highest-leverage fixes are Finding 1 (three missing graph edges, cheap and unambiguous to add) and Finding 2 (AD-7's internal contradiction with AD-2's own data model, which is a correctness bug in the spine itself, not just an underspecification).
