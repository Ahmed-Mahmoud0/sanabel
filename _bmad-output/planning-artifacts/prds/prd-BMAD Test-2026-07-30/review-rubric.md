# PRD Quality Review — PRD: Sanabel

## Overall verdict

This is a well-earned PRD for its stakes: a solo-builder, real-launch platform with two clear personas, thesis-driven prioritization, honest de-scoping, and traceability (Glossary → UJ → FR → SM) that downstream UX/architecture can actually source-extract from. The main risk is at the FR/NFR boundary — the one NFR that architecture will lean on hardest (video delivery performance) is stated in unbounded adjectives ("promptly," "appropriate quality") despite being called the platform's "binding constraint," and the Assumptions Index has a minor roundtrip break. Nothing here blocks handoff; the video-performance bound is the one gap worth closing before architecture starts sizing Cloudflare Stream.

## Decision-readiness — strong

Trade-offs are named with what was given up, not laundered into neutrality. §6.1 explicitly flags Interactive Code Exercises (FR-9, FR-20) as "the single largest technical-complexity addition in this PRD relative to the brief" and states the decision is intentional rather than scope creep. §4.8 accepts manual-only moderation as "the accepted tradeoff for a single-maintainer platform at launch scale" rather than presenting it as sufficient without qualification. `[NOTE FOR PM]` callouts land on genuine tensions — FR-4 (no self-service Instructor request flow), FR-9 (single Lesson Type per Lesson, against what Yousef's narration implied), FR-14/§4.2 notes (deferred pre-publish review queue), §8 (unresolved cost-cap mechanism). Open Questions (§10) are genuinely unresolved, not rhetorical-with-an-answer — e.g., Q2 (verifiable certificates), Q4 (upload caps), Q5 (minors/audience affecting privacy posture) all have real forks not pre-answered in the narrative.

### Findings
None — this dimension is a strength; no findings needed.

## Substance over theater — strong

Two personas (Yousef, Lina), both under the four-persona ceiling, and both are load-bearing: nearly every FR carries an explicit "Realizes UJ-1" / "Realizes UJ-2" tag, and the §4.x "Capability → FR mapping" blocks in each UJ close the loop the other direction. This is not persona theater. The Vision (§1) explicitly disclaims a technical moat ("Udemy, Coursera, Khan Academy, and freeCodeCamp already do free-forever coding education well... Sanabel's edge is posture") — an honest move that avoids innovation theater rather than manufacturing false differentiation. Most NFRs (§7) are specific, not boilerplate: RTL is scoped to named surfaces ("course-builder outline, video player controls, and progress bar"), accessibility is explicitly downgraded from a hard gate to aspirational with a stated reason. The one weak spot is the video-delivery NFR, which reads closer to boilerplate ("promptly," "appropriate quality") — see the Done-ness finding below; not repeated here to avoid double-counting.

### Findings
None beyond the cross-reference above.

## Strategic coherence — strong

The thesis is explicit and load-bearing: permanence of free access as the differentiator, not technology (§1). Feature prioritization follows from it rather than from ease — the Interactive Code Exercise scope call is thesis-driven ("what would make him feel the platform 'takes technical education seriously'") and is flagged as a deliberate departure from the brief, not something that crept in. Success Metrics avoid the vanity-metric trap: SM-5 explicitly reframes completion rate against free-platform norms (5–15%, sourced in addendum) rather than paid-platform expectations, and both counter-metrics are named and tied to specific SMs (SM-C1 counterbalances SM-2's growth pressure on Stream spend; SM-C2 counterbalances SM-1's course-quantity incentive). MVP scope reads as an "experience" MVP (full instructor-authoring loop + full learner-completion loop) with scope logic that matches — not a backlog with headings.

### Findings
None — strong.

## Done-ness clarity — adequate

Most FRs are testable either via an explicit "Consequences (testable)" block (FR-1 through FR-6, FR-9–FR-11, FR-13, FR-15–FR-17, FR-24, FR-30, FR-31) or because the FR statement itself carries a bound (FR-28's "once per Course," FR-14's "at minimum, per-Lesson completion/drop-off counts"). About half the FRs (FR-8, FR-10, FR-12, FR-18–FR-23, FR-25, FR-26, FR-28, FR-29) skip the explicit Consequences block, but nearly all remain testable from the FR text alone per the rubric's allowance that "sometimes the FR's consequences carry this."

### Findings
- **high** Video-delivery NFR has no bound (§7) — "Video Lessons must start playback promptly and support adaptive/appropriate quality for the learner's connection" uses unbounded adjectives ("promptly," "appropriate quality") for the NFR the addendum itself calls the platform's "binding constraint" to watch (cost-per-learner on Cloudflare Stream). Architecture needs a target (e.g., time-to-first-frame threshold, whether an adaptive bitrate ladder is in scope for v1) to size the Stream configuration; as written, this is deferred to architecture with no bound to design against. *Fix:* Add a numeric target (e.g., "playback starts within Xs on a 3G-equivalent connection") or explicitly mark it `[ASSUMPTION]`/Open Question if the number isn't yet decided.
- **low** Accessibility NFR hedges without a testable floor (§7) — "usable with screen readers and keyboard navigation where feasible" is a subjective qualifier with no minimum bar (e.g., which flows must be keyboard-navigable at minimum). Lower severity because the section already and honestly downgrades this to aspirational rather than a v1 gate, so the ambiguity mostly affects internal prioritization, not external commitments. *Fix:* If truly aspirational with no floor, say so explicitly rather than "where feasible"; if there is a minimum (e.g., video player must be keyboard-operable), name it.

## Scope honesty — strong

§5 Non-Goals does real work and distinguishes permanent principles from v1 deferrals in the same list ("No paid courses, ever" vs. "No mobile app in v1" — different classes, both stated plainly). §6.2 mirrors this distinction with reasoning attached to each deferral rather than silent omission (e.g., verifiable certificates: "deferred to when certificates need external credibility," with a forward-compatibility note that the ID structure should stay certificate-ready). De-scoping is proposed honestly throughout, including the explicit self-flag in §6.1 that Interactive Code Exercises exceed the brief's original scope. Given the stated stakes (solo builder, "real, if modest, public launch"), the open-items density (6 Open Questions + 4 inline `[ASSUMPTION]` tags + ~5 `[NOTE FOR PM]` callouts) is proportionate, not alarming — this reads as a PRD being honest about its edges, not one hiding gaps.

### Findings
None — strong; see Mechanical notes for one roundtrip defect in the Assumptions Index rather than a scope-honesty problem per se.

## Downstream usability — strong

§0 states this PRD explicitly feeds "whoever picks up UX and architecture work," so this dimension carries real weight. FR IDs run FR-1 through FR-32 contiguously with no gaps or duplicates. Every FR in the UJ-driving sections carries a "Realizes UJ-#" tag, and both UJs carry an explicit "Capability → FR mapping" back-reference — cross-references resolve both directions. The Glossary (§3) is used consistently in the sampled terms (Course, Module, Lesson, Instructor, Learner, Enrollment, Progress, Certificate, Rating, Visibility) across FRs and UJs. Both UJs have named protagonists carrying context inline (Yousef, Lina) — no floating UJs.

### Findings
None beyond the mechanical items noted below.

## Shape fit — strong

This is a genuine multi-stakeholder product (instructors and learners are distinct external roles, not just Ahmed operating internally), so UJ-driven shape with named protagonists is the right call — and the PRD keeps it to exactly the two UJs that matter rather than padding for template completeness. It is also chain-top (feeds UX → architecture), which is consistent with the traceability investment actually made (ID mapping, Glossary discipline, Assumptions Index). Nothing here reads as over- or under-formalized for a "real, if modest, public launch" of a two-sided platform.

### Findings
None — strong.

## Mechanical notes

- **Assumptions Index roundtrip is broken for one entry.** §0 states the convention plainly: "Inline `[ASSUMPTION: ...]` tags mark places this PRD inferred... all of them are indexed in §11." §11 lists five entries, but the first — "§4.2 FR-9 (Out of Scope note) — A Lesson has exactly one Lesson Type; combining formats within a single Lesson is deferred" — corresponds to an inline tag that reads `[NOTE FOR PM]`, not `[ASSUMPTION]` (see the FR-9 Out of Scope bullet in §4.2). The other four index entries (FR-27, FR-32, §7, §8 Privacy) all round-trip correctly to inline `[ASSUMPTION:...]` tags. Severity: low — the content itself is fine either way, but a downstream reader relying on the stated `[ASSUMPTION]`-tag convention to scan the doc would miss this one, and it muddies whether it's an assumption or a deferred decision.
- **Section-number self-correction in §8.** The Cost subsection reads: "not yet decided, see §8 Open Questions below (§9 in doc numbering — Open Questions)" — the author catches their own numbering error inline rather than fixing it, leaving a visible seam. Low severity, self-explanatory, but worth a cleanup pass before this PRD is treated as final.
- Glossary terms, FR IDs (FR-1–32), UJ IDs (UJ-1, UJ-2), and SM IDs (SM-1–5, SM-C1–2) are otherwise contiguous and consistently used — no other drift found.
- The document title itself is flagged unresolved ("*Working title — confirm.*" under the H1) — not a defect, just worth surfacing as a loose end alongside the Open Questions before downstream work locks in the product name.
