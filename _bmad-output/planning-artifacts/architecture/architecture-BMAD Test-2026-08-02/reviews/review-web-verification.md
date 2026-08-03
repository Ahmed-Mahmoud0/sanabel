---
name: 'Web Verification Review — ARCHITECTURE-SPINE.md'
type: review
target: '../ARCHITECTURE-SPINE.md'
created: '2026-08-02'
status: draft
---

# Web Verification Review — Sanabel Architecture Spine

Scope: every named technology in the Stack table and body of `ARCHITECTURE-SPINE.md`, checked against live web search (August 2026) for (1) continued existence/maintenance, (2) accuracy of stated version/status claims, (3) fitness for the stated use case. Special focus on AD-8 (PGlite-as-sandbox), the highest-stakes decision, per the review brief.

## Overall Verdict

The stack is current, real, and — with one significant exception — well-matched to its stated use cases; most claims read as genuinely researched rather than asserted, and the two places the spine already flags uncertainty with `[ASSUMPTION]` tags (Next.js 16 fallback, react-pdf Arabic bidi) turn out to be exactly the right things to be nervous about. The one meaningful gap is AD-8: PGlite is a legitimate and clever choice for the SQL-exercise sandbox, but the spine asserts a "hard CPU/time/memory ceiling enforced by the calling process" without specifying a mechanism, and PGlite's confirmed in-process, single-threaded, synchronous execution model means the naive implementation (call PGlite directly from the Server Action handler) cannot actually deliver a hard CPU/time ceiling — a pathological query will block the same JS event loop that would need to run the timeout that cancels it.

---

## Stack Table — Item by Item

### Next.js 16
**Claim:** "16 (App Router, React 19) — `[ASSUMPTION]` 15.5 (Maintenance LTS) is the fallback if a v16-specific issue blocks launch."

**Verified.** Next.js 16 is real, current, and stable as of mid-2026 — 16.2.6 shipped May 7, 2026 with Turbopack as the default bundler and React 19.2; by later patch releases (16.2.11) it is explicitly labeled **Active LTS**, with **15.5.21 labeled Maintenance LTS** — this exactly matches the spine's stated fallback plan, down to the specific version line. This claim reads as genuinely researched, not asserted; the version-pinning to 15.5 in particular is not a "guess a plausible number" pattern, it's the actual LTS lineage.
Sources: [Next.js 16 blog](https://nextjs.org/blog/next-16), [Next.js 16 App Router guide, 2026](https://dev.to/getcraftly/nextjs-16-app-router-the-complete-guide-for-2026-2hi3), [Next.js 16 + React 19.2 production guide](https://dev.to/x4nent/complete-guide-to-nextjs-16-react-192-in-production-rsc-security-view-transitions-turbopack-5090)

### TypeScript 5.x
**Claim:** "5.x" (no specific version pinned).

Not independently re-verified in depth — this is a low-risk, non-committal claim ("5.x" covers essentially the entire live TypeScript line as of 2026) and not worth research budget. No concern.

### Tailwind CSS v4 / shadcn/ui
**Claim:** "v4, with shadcn/ui component source (already set by UX DESIGN.md)."

**Verified.** shadcn/ui officially and fully supports Tailwind v4 as of 2026 — all components updated for Tailwind v4 and React 19, full support for the `@theme` directive, and the CLI initializes new projects on v4 by default. Note (not a flaw, just a fact worth the team knowing): Tailwind v4 "uses bleeding-edge browser features and is designed for modern browsers" — i.e. it drops meaningful support for older browsers. Given Sanabel has no stated legacy-browser requirement in the PRD, this is a non-issue, but it's a real tradeoff the spine doesn't mention.
Sources: [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4), [Tailwind v4 shadcn/ui migration guide 2026](https://www.buildmvpfast.com/blog/tailwind-v4-shadcn-ui-migration-breaking-changes-guide-2026)

### Drizzle ORM
**Claim:** "latest stable" (no version pinned).

**Verified, and the non-pinning is the right call.** As of mid-2026 Drizzle's actual latest *stable* is 0.45.2; a 1.0 line exists but is still in beta (v1.0.0-beta.22, April 2026) with "occasional API churn" expected before the real 1.0 cut. Had the spine asserted "Drizzle 1.0" that would have been a stale/wrong claim; by saying "latest stable" it correctly avoids committing to a number that would be wrong today. No issue.
Sources: [Drizzle ORM npm](https://www.npmjs.com/package/drizzle-orm), [Drizzle latest releases](https://orm.drizzle.team/docs/latest-releases)

### Postgres 17 on Neon
**Claim:** "17, hosted on Neon (serverless, scale-to-zero)."

**Verified.** Neon's scale-to-zero model, disaggregated storage/compute, and copy-on-write branching are all real, current (2026) product features, and Neon was acquired by Databricks (2025) with subsequent price cuts, not a wind-down signal. Fits the "solo builder, low/bursty traffic" framing in AD-12 well.
Sources: [Neon Postgres 2026 review](https://medium.com/@philmcc/neon-postgres-review-serverless-postgresql-that-actually-scales-to-zero-ee14d4e109ba), [Neon pricing 2026](https://vela.simplyblock.io/articles/neon-serverless-postgres-pricing-2026/)

### Better Auth
**Claim:** "latest stable (email/password + Google + GitHub OAuth)."

**Verified — and understated relative to how strong this pick turned out to be.** Auth.js (formerly NextAuth.js) merged into Better Auth's stewardship in September 2025 and is now in maintenance-only mode (security patches, no new features) — the ecosystem consensus is explicitly "fine for existing projects, not recommended to start new projects on it." More recently, **Vercel is acquiring Better Auth outright** to fold into its own platform. Since Sanabel is a Next.js app deploying to Vercel, this is a materially good signal the spine doesn't mention: the auth library and the deployment platform are converging under one vendor. This is a place where deeper research would have let the spine make a *stronger* claim than it did, not a weaker one — worth a note back to the architect, not a flag against the choice.
Sources: [Auth.js joins Better Auth](https://better-auth.com/blog/authjs-joins-better-auth), [Vercel acquires Better Auth](https://vercel.com/blog/vercel-acquires-better-auth), [Better Auth vs Clerk vs Auth.js 2026](https://www.buildmvpfast.com/blog/better-auth-vs-clerk-vs-authjs-nextjs-decision-tree-2026)

### next-intl
**Claim:** "latest stable (App Router, RTL/ICU support for Arabic)."

**Verified.** next-intl remains the standard i18n solution for Next.js App Router in 2026 (small bundle, native Server Component support, middleware-based locale routing). One caveat surfaced in research: next-intl's own RTL handling is *directional* (you still set `dir="rtl"` yourself off the active locale, which AD-9 already does correctly) rather than a magic "RTL mode" — third-party guidance recommends pairing it with CSS logical properties. The spine's AD-9 rule already does the right thing here (`dir="rtl"` driven off active locale), so no correction needed, just confirms the approach is idiomatic rather than a shortcut.
Sources: [next-intl 2026 guide](https://stacknotice.com/blog/nextjs-i18n-next-intl-guide-2026), [next-intl App Router i18n guide](https://nextjslaunchpad.com/article/nextjs-internationalization-next-intl-app-router-i18n-guide)

### Cloudflare Stream
**Claim (Stack table + AD-5):** "managed service — inherited from PRD"; AD-5 asserts a single canonical `queued | processing | ready | failed` enum driven exclusively by Cloudflare Stream webhooks.

**Verified, with one nuance the spine glosses over.** Cloudflare Stream webhooks and a video `state` field are real and current. However, the *actual* state values Cloudflare returns are richer than AD-5's four: `pendingupload, downloading, queued, inprogress, ready, error, live-inprogress`, and — more importantly — **`ready` can fire before encoding is fully complete**: "videos in the ready status are playable but may still be encoding certain quality levels until `pctComplete` reaches 100." AD-5's binary status model is a reasonable app-level simplification (collapsing Cloudflare's states into four is normal practice), but the spine should note explicitly that the *mapping* from Cloudflare's states to the app's `ready` needs a decision (does the app's "ready" fire on Cloudflare's first `ready` event, potentially before the highest quality tier is available, or does it wait for `pctComplete = 100`?) — this is currently unstated and could produce inconsistent behavior between the author-side status chip and the learner-side player that AD-5 explicitly exists to prevent.
Sources: [Cloudflare Stream webhooks docs](https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/), [Cloudflare Stream FAQ](https://developers.cloudflare.com/stream/faq/)

### Cloudflare R2
**Claim:** "managed service (PDF uploads, certificate files)."

**Verified.** Current, actively marketed, zero-egress-fee object storage; S3-compatible API. Good fit for the stated use case (PDF/certificate file storage with no expected heavy egress cost surprise).
Source: [Cloudflare R2 product page](https://www.cloudflare.com/products/r2/)

### PGlite (`@electric-sql/pglite`) — AD-8, the highest-stakes decision
**Claim:** "Postgres 17 compiled to WASM — SQL exercise sandbox"; AD-8 additionally claims: "ephemeral, in-memory PGlite instance per submission: no network egress, a hard CPU/time/memory ceiling enforced by the calling process, and the instance discarded after grading."

This is where the review found a **confirmed, material gap**, not just a plausible concern. Full breakdown below.

**What's confirmed true and is a genuine strength:**
- PGlite is real, current, and heavily used: 10 million weekly npm downloads as of June 2026, active development (v0.4 shipped March 2026 with PostGIS, connection multiplexing). It is genuinely "Postgres compiled to WASM" — the claim is accurate.
- **No network egress is a real, structural guarantee**, not just a policy choice: PGlite compiled via Emscripten to WASM has no ambient socket access unless a host explicitly wires one in. This is a stronger guarantee than a typical container-based sandbox where network egress is a firewall rule that can be misconfigured.
- **Memory ceiling is a real, structural guarantee**: WASM linear memory has a configurable max-pages limit set at instantiation; the host (Node.js) can cap it, and PGlite exceeding it fails hard rather than consuming unbounded host RAM. This part of AD-8's claim is technically sound.
Sources: [PGlite reaches 10M weekly downloads](https://electric.ax/blog/2026/06/25/pglite-reaches-10-million-weekly-downloads), [PGlite v0.4 announcement](https://electric.ax/blog/2026/03/25/announcing-pglite-v04), [PGlite GitHub](https://github.com/electric-sql/pglite)

**What's unconfirmed / not actually true as stated — the CPU/time ceiling:**
- PGlite's own GitHub description is explicit: it is a **"high-performance, in-process, zero-dependency embedded PostgreSQL database engine"** running in **Postgres single-user mode** — i.e., one process, one connection, no forking (WASM/Emscripten cannot fork). The project has **no `SECURITY.md`** and its own docs (`pglite.dev/docs/about`) contain **no discussion whatsoever** of running untrusted/adversarial SQL, resource limiting, or a security model — this is not a documented, designed-for use case of the library; it's a repurposing.
- This matters concretely for AD-8's "hard CPU/time ceiling" claim: because PGlite executes synchronously, in-process, on a single thread, **a pathological query (e.g., an unbounded recursive CTE, a large cross join) blocks the same JS event loop that any JS-level timeout (`setTimeout`, `Promise.race`) would need to use to cancel it.** A timer callback cannot preempt synchronous WASM computation on the same thread — it simply won't fire until the blocking call returns. This is a general, well-established JS/WASM limitation, not PGlite-specific, but AD-8 doesn't address it: it asserts the ceiling is "enforced by the calling process" without saying *how*, and the one obvious naive implementation (call PGlite directly inside the Server Action) cannot deliver it.
- Corroborating evidence of fragility under this exact failure mode: there are open reports of PGlite/Bun processes **hanging indefinitely at high CPU** after a query completes, requiring a hard process kill — i.e., PGlite is already known to produce exactly the "won't return control" failure mode this concern is about, even without adversarial input.
- **The fix is well-known and not exotic**, but it is not currently named anywhere in the spine: run each PGlite grading instance inside a Node.js **`worker_thread`** (a separate V8 isolate with its own event loop), so the parent Server Action can `worker.terminate()` it on a wall-clock timeout regardless of whether the worker's synchronous WASM call has returned. Alternatively, run grading in its own short-lived process/container. AD-8's Structural Seed diagram literally labels the sandbox "PGlite sandbox — ephemeral, **in-process**" — which, taken literally, is the one topology that does *not* support a hard, externally-enforced time ceiling.
Sources: [PGlite GitHub repo description](https://github.com/pglite/pglite), [PGlite npm](https://www.npmjs.com/package/@electric-sql/pglite), [PGlite about docs (fetched directly, no security/isolation content found)](https://pglite.dev/docs/about), [gbrain: PGlite process hangs indefinitely at high CPU](https://github.com/garrytan/gbrain/issues/1269)

**Verdict on AD-8: PLAUSIBLE-BECOME-CONFIRMED concern.** PGlite itself is a defensible, even clever, choice for this problem (few alternatives give you real Postgres semantics — window functions, CTEs, constraints — in a disposable sandbox this cheaply). The gap is not "wrong tool," it's that **AD-8 asserts an isolation property (hard CPU/time ceiling) that the underlying library does not provide out of the box, and the specific topology named in the spine ("in-process") is the one that cannot deliver it without an additional wrapping mechanism.** This is exactly the kind of thing that should be a named invariant, not left implicit: the spine should say explicitly that grading instances run inside a `worker_thread` (or process-level equivalent) specifically so a wall-clock timeout can forcibly terminate a runaway query, not just "the calling process enforces a ceiling." Given the PRD treats sandboxing as a security-critical NFR rather than a nice-to-have, this should be promoted from an implicit assumption to an explicit rule in AD-8 (or a new AD) before implementation starts.

### Resend + React Email
**Claim:** "latest stable — transactional email."

**Verified.** Both are real and current; React Email shipped a major 6.0 release (April 2026, visual editor, 2M weekly downloads, +108% since the prior major). Good, standard fit for transactional email in a Next.js app; no concerns.
Sources: [React Email 6.0 announcement](https://resend.com/blog/react-email-6)

### @react-pdf/renderer
**Claim:** "latest stable — `[ASSUMPTION]` Arabic bidi/RTL text fidelity in generated certificate PDFs is unverified; spike before committing, fallback is headless-browser HTML-to-PDF if bidi text breaks."

**Verified as a real, well-founded risk — the spine's own flagged assumption is correct and, if anything, understated.** There is a long, still-active history of Arabic/Hebrew bidi bugs in this exact library: dropped ligatures during bidi reordering, undefined-glyph rendering, broken character ordering after line breaks, and a still-open GitHub issue thread going back to 2019. As recently as March 2026 a third party published a standalone library specifically "to fix RTL (Hebrew/Arabic) text rendering in @react-pdf/renderer — broken since 2019," which strongly suggests the built-in bidi support is *still* not reliable as of the architecture's date. The spine's mitigation (spike first, fall back to headless-browser HTML-to-PDF) is the right call; given how much prior art shows this breaking, it would be reasonable to treat the fallback as the *default* plan rather than a contingency, or at minimum to schedule the spike very early rather than deferring it.
Sources: [react-pdf bidi issue #2900](https://github.com/diegomura/react-pdf/issues/2900), [react-pdf Arabic ligatures issue #3406](https://github.com/diegomura/react-pdf/issues/3406), [third-party RTL fix library, March 2026](https://techresolve.blog/2026/03/09/i-built-a-library-to-fix-rtl-hebrew-arabic-text/)

### Vercel + Neon branch-per-PR (AD-12)
**Claim:** "one production environment (Vercel + Neon primary branch). Every PR gets a Vercel preview deploy wired to an ephemeral Neon database branch (schema+data fork of primary), torn down on merge or close."

**Verified precisely.** This is a real, native, documented integration: Neon's Vercel-native integration creates a Neon branch per Vercel preview deployment automatically via webhook, injects the connection string as a scoped environment variable, and uses copy-on-write branching so each preview gets an instant full schema+data fork. AD-12's description matches the actual product mechanism almost exactly — this reads as genuinely researched.
Sources: [Neon Vercel native integration](https://neon.com/blog/neon-vercel-native-integration), [Neon + Vercel preview deployments](https://neon.com/blog/neon-vercel-integration)

### UUIDv7 (Consistency Conventions)
**Claim:** "IDs are UUIDv7 (time-sortable) on every table."

**Verified, and correctly current best practice.** UUIDv7 is standardized (RFC 9562, May 2024) and by 2026 is described as the default recommendation for new database primary keys — B-tree-friendly time ordering, insert/lookup performance comparable to bigint, without a bigint's single-writer coordination problem. Good, current choice; no concerns. (Minor implementation note, not a flaw in the spine: native `uuidv7()` generation landed in Postgres 18, not 17, so on Postgres 17 the app/ORM layer — or a `pg_uuidv7`-style extension — needs to generate the values rather than relying on a database-native function; worth a one-line implementation note somewhere, but this doesn't undermine the architectural decision.)
Sources: [UUIDv7 in Postgres 18](https://www.thenile.dev/blog/uuidv7), [UUID 2026 guide, RFC 9562](https://qubittool.com/blog/uuid-complete-guide)

### Vercel (Deployment)
**Verified.** Current, active, and the natural pairing given Next.js authorship; Vercel Functions support up to 900s duration (Pro/Enterprise) or Fluid Compute concurrency — worth flagging one adjacent consideration surfaced during the PGlite research (see AD-8 section above): if Sanabel's grading Server Action runs under Vercel's **Fluid Compute** concurrency mode (multiple requests sharing one warm instance), a synchronously-blocking PGlite call in one request could stall *other concurrent requests* on the same warm instance, not just the submitter's own request — reinforcing the case for wrapping grading in a `worker_thread` regardless of which Vercel compute mode is used.
Sources: [Vercel Functions limits](https://vercel.com/docs/functions/limitations)

---

## Summary of Findings

| # | Item | Severity | Status |
| --- | --- | --- | --- |
| 1 | AD-8: "hard CPU/time ceiling enforced by the calling process" is not achievable with PGlite run in-process/synchronously as literally described; no `worker_thread`/process-isolation mechanism is named | **High** | **CONFIRMED** |
| 2 | AD-8: PGlite has no documented security model / SECURITY.md for adversarial input; the sandbox use case is a repurposing, not a designed-for scenario | Medium | **CONFIRMED** |
| 3 | @react-pdf/renderer Arabic bidi fragility — spine's own flagged assumption is correct and probably still under-weighted (fallback should arguably be the default plan) | Medium | **CONFIRMED** (spine already flags it; severity is if anything higher than stated) |
| 4 | AD-5's 4-state enum doesn't specify how Cloudflare Stream's actual 7 states (esp. early `ready` before `pctComplete=100`) map onto it | Low–Medium | **CONFIRMED** gap, low severity |
| 5 | UUIDv7 native generation (`uuidv7()`) is a Postgres 18 feature; spine targets Postgres 17, so ID generation must happen at the app/ORM layer, not implicitly in the DB | Low | **CONFIRMED**, minor |
| 6 | Vercel Fluid Compute concurrency could let one hung grading request stall other concurrent users' requests on the same warm instance | Medium | **PLAUSIBLE** (depends on which Vercel compute mode is actually configured) |
| 7 | Better Auth / Vercel: Vercel is acquiring Better Auth — this *strengthens* the case for the choice already made, not a problem, but the spine doesn't mention it | Informational | **CONFIRMED**, positive |

Everything else in the Stack table (Next.js 16, TypeScript, Tailwind v4/shadcn, Drizzle, Neon Postgres 17, next-intl, Cloudflare Stream/R2 as services, Resend/React Email, Vercel+Neon branching, UUIDv7 as a general choice) checked out as current, real, and fit for purpose, with claims that read as researched rather than asserted.
