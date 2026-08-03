---
title: PRD Addendum: Sanabel
created: 2026-07-30
updated: 2026-07-30
---

# PRD Addendum: Sanabel

Supporting depth pulled out of the PRD narrative — technical how-to, rejected alternatives, and research grounding referenced during drafting.

## Video hosting — options considered

Researched three tiers for hosting instructor-uploaded course video:

- **Third-party embed (YouTube/Vimeo unlisted)** — free, but weak access control (unlisted links leak), ads/other-creator suggestions around the player, no analytics/DRM.
- **Managed video service (Cloudflare Stream / Mux)** — usage-based, predictable at low scale (~$5/1,000 min stored + $1/1,000 min delivered on Cloudflare Stream). Mux was considered but is generally more expensive at scale in comparable pricing analyses.
- **Self-hosted object storage + CDN** — only cost-effective at very high volume (1M+ hours/month); rejected as an unrealistic engineering/ops burden for a solo builder pre-scale.

**Decision:** Cloudflare Stream. Cost-per-learner is the binding constraint to watch since Sanabel has no revenue plan; migration/cost-cap decisions belong in architecture, not this PRD.

## Certificates — verification approach considered

Industry norm for course-completion certificates (Coursera, HBS Online, LinkedIn integrations) is a public verification page: a unique Credential ID + URL that resolves to a page confirming name/course/date, pasteable into LinkedIn's "Add certification" flow. A plain downloadable file with no lookup is common but considered weak/spoofable.

**Decision:** v1 ships a simple downloadable certificate file, not a verifiable public-link/ID, to keep v1 build scope smaller. Revisit if/when certificates are meant to carry real external credibility (e.g., learners citing them to employers) — the verify-by-ID pattern is the natural v2 upgrade and is cheap to retrofit if certificate records are already structured with a unique ID.

## Moderation — options considered

Comparable solo/volunteer-run platforms (freeCodeCamp forum, Discourse-based communities) layer: community flagging (only flagged content gets reviewed, not pre-moderation of everything), automated spam filtering, and trust-level gating (new accounts rate/link-limited until they've shown history).

**Decision:** v1 ships manual review by Ahmed only — simplest to build, accepted as unable to scale past a small userbase. Flagging + automated filtering + trust levels are the natural next layers if/when volume outgrows manual review. Related risk flagged by research: open instructor upload without any gatekeeping invites low-effort/scraped courses over time; lightweight review queues or reputation-gated publishing are the typical mitigation once volume grows — not needed for v1 launch scale but worth flagging for the roadmap.

## Funding model context

freeCodeCamp (501c3 nonprofit, ~$5/mo recurring donors + sponsors) and Khan Academy (large nonprofit, philanthropic grants) are the reference points for "free forever" education platforms — both required nonprofit incorporation and years of runway before donation revenue became material. Neither model is reachable by a solo, unincorporated builder at launch. This grounds the brief's "no monetization pressure" success criterion: it's a scope choice, not yet a funded/sustainable one, and infrastructure cost-per-learner (mainly video) is the real constraint until/unless that changes.

## Completion rates — research context

Free MOOC-style completion rates average 5–15% (vs. much higher for paid or short-format courses); short modular lessons see far better completion than long ones. Sanabel's success metrics and lesson-format guidance should expect this rather than read it as failure.
