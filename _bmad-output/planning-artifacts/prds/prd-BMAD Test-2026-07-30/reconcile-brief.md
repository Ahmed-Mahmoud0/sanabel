---
title: Input Reconciliation — brief.md vs PRD + Addendum
input: brief.md (Product Brief: Sanabel, status: final)
checked_against: prd.md, addendum.md (status: draft)
date: 2026-07-30
---

# Reconciliation: brief.md → prd.md / addendum.md

## Method
Every line item in the brief's "In (v1)" scope, Success Criteria, Who This Serves, "Out (for now)," What Makes This Different, and Vision sections was traced to a specific FR, Non-Goal, or explicit PRD statement. All four brief `[ASSUMPTION]` tags were checked for resolution or explicit carry-forward. Qualitative/tone language was compared for drift toward generic SaaS framing.

---

## 1. Brief commitments vs PRD coverage (In-v1 scope, Success Criteria, Who This Serves)

| Brief item | PRD coverage | Status |
|---|---|---|
| Instructor accounts w/ upload capability | FR-4, FR-6, FR-7, FR-9 | Covered |
| Lessons: video, text, PDF, "or otherwise" | FR-9 (Video, Text, PDF, **+Quiz, +Interactive Code Exercise**) | Covered, but expanded — see §3 below |
| Learner accounts, sign-in required to view any course | FR-1–3, FR-17 (enrollment) **but** FR-15/FR-16 allow browse + full course-detail view (incl. module/lesson outline titles, instructor bio, ratings) with **no sign-in** | **Partial drift — see Gap 1** |
| Progress tracking per learner/course | FR-18, FR-19, FR-23 | Covered |
| Certificates on completion | FR-24 | Covered |
| Comments/discussion | FR-26, FR-27 | Covered |
| Ratings/reviews | FR-28, FR-29 | Covered |
| Search/browse by topic | FR-15 | Covered |
| Web application | Non-Goals, MVP §6.1 | Covered |
| Success Criteria: Ahmed builds+publishes course end-to-end | SM-1 | Covered |
| Success Criteria: learner signs in, browses, completes, certificate | SM-2 | Covered |
| Success Criteria: discuss + rate | SM-4 | Covered |
| Success Criteria: stays free, no monetization pressure | Non-Goals ("No paid courses, ever"), SM-3 | Covered |
| Who This Serves — instructors, no platform cut/gating | FR-3 role model, Non-Goals | Covered |
| Who This Serves — learners, progress + community | FR-18/19/23, FR-26–29 | Covered |

---

## 2. Brief "Out" items — creep check

| Brief "Out" item | PRD treatment | Status |
|---|---|---|
| Mobile app `[ASSUMPTION: possible later phase]` | Non-Goals: "No mobile app in v1... possible later phase, not committed." §2.2 Non-Users explicitly excludes "Mobile-first users expecting a native app." FR-12's "including on mobile" refers to **responsive web rendering**, not a native app. | **No creep** — correctly carried forward |
| Donations for instructors | Non-Goals: "No donation/payment feature in v1... Possible later addition per the brief, explicitly never a gate on access." | **No creep** — correctly carried forward, language nearly verbatim |

No scope creep found on either explicit "Out" item — both are faithfully preserved as non-goals with the same "possible later, not committed / never a gate" framing as the brief.

---

## 3. Scope additions beyond the brief (flagged transparently vs silently)

- **Interactive Code Exercises** (FR-9, FR-20, FR-21): PRD §6.1 explicitly self-flags this as "the single largest technical-complexity addition in this PRD relative to the brief" and calls it "a visible, deliberate scope call." This is a **transparent** addition — good practice, not a silent gap.
- **Quizzes** (FR-9, FR-22): PRD does *not* similarly flag that Quiz-as-lesson-type has a different provenance than Interactive Code Exercises. The brief's Vision section — explicitly marked `[ASSUMPTION]`, described as "not yet discussed in depth," and stamped "should be revisited once v1 exists" — lists "richer lesson interactivity (quizzes)" as a *speculative future-phase* idea, not confirmed v1 scope. The PRD pulls this directly into committed v1 (FR-9, FR-22, MVP §6.1) without noting that it originated in the brief's speculative Vision rather than its confirmed Scope section. See **Gap 3**.

---

## 4. Qualitative / tone reconciliation

- **"Posture, not mechanics/features"** — Brief: "Sanabel's difference is its posture, not its mechanics." PRD Vision (§1): "Sanabel's edge is posture: it exists purely to keep the gate open, permanently, because Ahmed controls the mission and doesn't need to monetize it." — **Faithfully carried forward**, near-verbatim.
- **"No gatekeeping" (access/payment)** — Brief: "No paywall, no tiered access — sign in and learn"; instructors get a platform "not... gating their content behind pricing tiers they don't control." PRD JTBD (§2.1) mirrors this almost word-for-word. — **Faithfully carried forward.**
  - Minor tension worth noting: addendum's "Early traps flagged by research" section raises "reputation-gated publishing" as a future anti-spam mitigation. This is about *content-quality* gatekeeping, not *access/payment* gatekeeping, so it doesn't contradict the brief's actual "no gatekeeping" claim — but it sits close enough to the ethos that a future PM should keep the distinction explicit (access is never gated; content moderation is a separate axis).
- **Free-forever as moral stance, "not revenue or scale"** — Brief: "This is a personal project... its first measure of success is simply existing and working, not revenue or scale." PRD reflects this in Non-Goals/Vision, but **§9 Success Metrics drifts toward growth-SaaS framing** — see **Gap 4**.
- **The name Sanabel's meaning** — Brief: "ears of wheat," symbolizing growth/productivity, tied to the free-education conviction. PRD §0 calls the title "Working title — confirm" and never revisits the name's meaning narratively. The one place the name resurfaces is FR-31: "Sanabel's UI ships bilingual from v1, reflecting its name and intended audience reach" — using the Arabic name to justify a brand-new bilingual EN/AR + RTL requirement that the brief never mentions. This is a bigger issue than lost flavor text — see **Gap 2**.

---

## 5. Brief `[ASSUMPTION]` tags — resolved, carried forward, or dropped?

| # | Brief assumption | PRD treatment | Status |
|---|---|---|---|
| 1 | Problem section: specific learners/community/region this matters most for "haven't been defined further... worth sharpening" | §2 Target User defines personas (Yousef, Lina) by role/goal, not region. The regional/community question is never explicitly answered — instead it's **implicitly** answered by inventing an EN/AR bilingual requirement (FR-31/32) grounded only in the name's etymology, and by an aside in §8 Privacy `[ASSUMPTION: ...bilingual EN/AR reach increases this likelihood...]`. The core "who/where" assumption itself is not in §11 Assumptions Index. | **Silently resolved via inference, not surfaced for confirmation — see Gap 2** |
| 2 | "What Makes This Different": needs "a harder answer to 'why Sanabel over freeCodeCamp'" if it grows past personal project | PRD Vision restates the same honest "no moat" framing, doesn't attempt the harder answer — but doesn't claim to have resolved it either. | **Carried forward as-is** (acceptable — PRD doesn't misrepresent it as solved) |
| 3 | Scope "Out": mobile app "possible later phase, not committed" | Non-Goals, §2.2 Non-Users | **Carried forward correctly** |
| 4 | Vision: speculative post-v1 path incl. donations, mobile, quizzes, "should be revisited once v1 exists" | Donations/mobile correctly stayed Out; **quizzes were pulled into confirmed v1 scope** without reconciling that the brief placed them in speculative future-Vision, not committed scope. | **Partially dropped — see Gap 3** |

PRD's own §11 Assumptions Index (FR-9 lesson-type exclusivity, FR-27 flat comments, FR-32 language tagging, §7 accessibility, §8 GDPR) is a reasonable and appropriately-scoped list of *new* PRD-level assumptions — but it does not cross-reference or carry forward the brief's own four assumption tags explicitly, which is a missed reconciliation step for a Finalize gate.

---

## Gaps Identified

**Gap 1 — "Sign-in required to view any course" vs. pre-signup browse/detail access.**
Brief Scope (In v1): "Learner accounts with sign-in required to view any course." PRD FR-15 (browse/search) and FR-16 (course detail page: title, instructor bio, preview video, full module/lesson outline titles, aggregate rating/reviews) are explicitly open to signed-out visitors — only Lesson *content* is gated behind Enrollment (FR-17). This is a plausible, even well-reasoned, product refinement (it powers UJ-2's "decide before committing" moment) — but it's a direct reinterpretation of a specific brief scope line, and the PRD doesn't call out that it's diverging from that line. Worth an explicit confirmation with Ahmed rather than an implicit one.

**Gap 2 — Bilingual EN/AR + RTL requirement (FR-31, FR-32) has no grounding in the brief and silently resolves an open brief assumption.**
The brief never mentions Arabic, bilingual UI, RTL, or a specific regional/linguistic audience anywhere — and explicitly flags "the specific learners this matters most for (e.g.,... a particular community or region)" as an unresolved `[ASSUMPTION]` needing confirmation before it hardens. The PRD introduces a substantial v1 commitment (full bilingual UI, RTL layout across course-builder/video player/progress bar per the Feature NFR) justified only by "reflecting its name and intended audience reach" (FR-31 description) — inferring a regional audience from etymology rather than from Ahmed. This should have been raised as an `[ASSUMPTION]` in §11 and flagged for explicit confirmation at Finalize, not built in as settled scope.

**Gap 3 — Quizzes (and by extension Interactive Code Exercises) pulled forward from the brief's speculative Vision into committed v1 scope, without full reconciliation.**
The brief's Vision section is explicitly `[ASSUMPTION]`-tagged, "not yet discussed in depth," and named as a "speculative" future path "if Sanabel takes off" — listing "richer lesson interactivity (quizzes)" as one such future idea. The PRD's §6.1 "honest flag" acknowledges that Interactive Code Exercises go beyond the brief's lesson-format scope (video/text/PDF/other), but never notes that Quizzes specifically were the brief's own example of a *deferred, speculative* idea rather than a v1-scoped one. Net effect: two lesson types the brief treated as "maybe later, unconfirmed" are now both fully committed v1 FRs with no flagged confirmation step.

**Gap 4 — Success Metrics (§9) tone drift toward growth/SaaS optimization language.**
Brief Success Criteria are deliberately minimal for a personal project — "first measure of success is simply existing and working, not revenue or scale" — and explicitly instruct that the bar should stay at "does it work" until there's "real usage," at which point it should be revisited. PRD §9 already includes secondary and counter-metrics (SM-4 organic-activity targets, SM-5 completion-rate benchmarking against "free-platform norms," SM-C1 spend-per-active-learner, SM-C2 course-quantity-vs-quality optimization pressure) — these read as standard product-growth SaaS metrics that anticipate and manage growth dynamics the brief explicitly said weren't the point yet. Not necessarily wrong (they're well-reasoned and addendum-grounded), but they flatten some of the brief's "this is not a business, don't treat it like one yet" posture into a metrics framework built for a scaling product.

---

## Non-gaps worth noting
- Donations and mobile app: correctly kept out, language preserved almost verbatim from the brief.
- "Posture not mechanics," "no gatekeeping" on access/payment, freeCodeCamp-humility framing: all faithfully carried into PRD Vision/JTBD language.
- Certificate verification, moderation approach, video hosting: all reasoned through in the addendum and consistent with the brief's minimal-v1 posture — no drift.
