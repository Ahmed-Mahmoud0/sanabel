---
baseline_commit: NO_VCS
---

# Story 1.0: Project Scaffold & Deployment Pipeline

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the builder of Sanabel,
I want a working, deployed project skeleton with the full stack wired together,
So that every subsequent story in Epic 1 onward is implementing product features on top of a verified foundation, not discovering scaffold gaps mid-story.

*Technical enabler story — no end-user persona; exists so the scaffold work Architecture assigns to Epic 1 (no starter template specified, AD-12) has its own acceptance criteria instead of being implicitly assumed inside Story 1.1.*

## Acceptance Criteria

1. **Given** a fresh clone of the repository, **when** dependencies are installed and the dev server is started, **then** Next.js 16 (App Router, React 19, TypeScript 5.x, Tailwind v4 + shadcn/ui) serves a running local app with no build errors.
2. **Given** the project's database configuration, **when** the app connects to Postgres, **then** it connects to a Neon Postgres 17 database via Drizzle ORM, and Drizzle's migration tooling successfully applies an initial (even if still-empty) schema.
3. **Given** the project's auth configuration, **when** Better Auth is initialized, **then** it is wired for DB-backed sessions (not JWT) with email/password and Google/GitHub OAuth providers configured (credentials may be placeholder/dev values at this stage — Story 1.1/1.2 build the actual sign-up/sign-in flows on top of this).
4. **Given** the project's i18n configuration, **when** a placeholder route is rendered, **then** next-intl serves both an `en` and `ar` locale segment, `dir="rtl"` applies correctly when Arabic is active, and `en.json`/`ar.json` message catalogs exist and load.
5. **Given** DESIGN.md's token system, **when** the base Tailwind theme is inspected, **then** the color, typography, spacing, and radius tokens from DESIGN.md's frontmatter are wired into the Tailwind config (not hard-coded per component), and light/dark mode both render using them.
6. **Given** a pull request is opened against the repository, **when** CI runs, **then** it builds successfully and Vercel creates a preview deployment wired to an ephemeral Neon database branch (a schema+data fork of primary), per AD-12.
7. **Given** a pull request is merged or closed, **when** cleanup runs, **then** its ephemeral Neon preview branch is torn down, per AD-12.
8. **Given** the `main` branch, **when** it is deployed, **then** it serves the one production environment (Vercel + Neon primary branch) at a real, reachable URL.

## Tasks / Subtasks

- [x] Task 1: Scaffold Next.js 16 app (AC: #1)
  - [x] Init with App Router, React 19, TypeScript 5.x strict mode
  - [x] Install and configure Tailwind CSS v4 + shadcn/ui (`components.json`, base primitives dir)
  - [x] Verify `next build` and `next dev` run clean with zero errors/warnings
- [x] Task 2: Wire Postgres + Drizzle ORM (AC: #2)
  - [x] Create a Neon Postgres 17 project/branch; store connection string as an env var (never committed)
  - [x] Add `lib/db/` — Drizzle client init, schema barrel, `drizzle.config.ts`
  - [x] Generate and apply an initial migration via Drizzle Kit; confirmed applied cleanly against Neon (`user`/`session`/`account`/`verification` tables verified present via a live query)
- [x] Task 3: Wire Better Auth (AC: #3)
  - [x] Add `lib/auth/` — Better Auth config using the Drizzle Postgres adapter, session strategy set to database-backed (not JWT)
  - [x] Configure email/password provider and Google + GitHub OAuth providers with placeholder/dev credentials (env-driven, no real secrets committed)
  - [x] Do NOT implement sign-up/sign-in UI or `requireRole()`/`can()` helpers yet — that's Story 1.1/1.2 (auth) and 1.3/1.4 (role helpers); this task only proves the config wires up and a session round-trips
- [x] Task 4: Wire next-intl i18n shell (AC: #4)
  - [x] Add `app/[locale]/` segment structure with `en` and `ar` routes
  - [x] Add `lib/i18n/` — next-intl config, `en.json`/`ar.json` message catalogs (placeholder keys are fine)
  - [x] Confirm `dir="rtl"` applies at the HTML/root level when the `ar` locale is active, `dir="ltr"` for `en`
- [x] Task 5: Wire Tailwind theme to DESIGN.md tokens (AC: #5)
  - [x] Translate DESIGN.md frontmatter (`colors`, `typography`, `rounded`, `spacing`) into Tailwind v4 theme config (CSS `@theme` or equivalent) — tokens as variables, not hard-coded per component
  - [x] Wire both light and dark variants of every color pair (`*-dark` suffixed tokens) via `prefers-color-scheme`, with a user-override mechanism (defer full theme-switcher UI to a later story; the token plumbing must exist now)
  - [x] Render one placeholder page using at least one primary/secondary/accent color and one typography role to prove tokens flow end-to-end
- [x] Task 6: Scaffold module directory structure (AC: #1, supports all future epics)
  - [x] Create empty `lib/modules/{accounts,course-authoring,learning-experience,certificates,discussion,ratings,moderation,code-execution}/` directories per the Architecture source tree — each will get its schema slice + service layer in later stories
  - [x] Create `app/[locale]/(marketing)/`, `(learner)/`, `(instructor)/`, `(admin)/` route groups (can be empty/placeholder pages)
  - [x] Create `app/api/` for future webhook/upload Route Handlers, `emails/` for React Email templates, `drizzle/` for generated migrations
- [ ] Task 7: CI + Vercel preview pipeline with Neon branching (AC: #6, #7) — **BLOCKED: needs user's GitHub/Vercel/Neon accounts**, see Completion Notes
  - [x] Author `.github/workflows/ci.yml` (lint, typecheck, build on PR/push) — ready to run once the repo is pushed to GitHub
  - [ ] Connect the repository to Vercel; confirm PR-triggered preview deployments build successfully
  - [ ] Wire Neon's Vercel integration (or equivalent CI step) so each PR provisions an ephemeral Neon branch (schema+data fork of primary) and injects its connection string into that PR's preview env
  - [ ] Confirm the ephemeral Neon branch is torn down automatically when the PR is merged or closed
- [ ] Task 8: Production deployment (AC: #8) — **BLOCKED: needs user's Vercel account**, see Completion Notes
  - [ ] Deploy `main` to Vercel production, wired to the Neon primary branch
  - [ ] Confirm the production URL is reachable and serves the scaffolded app with no build errors

## Dev Notes

- **This is a foundation-only story.** No product feature (auth flows, role gating, course content, etc.) is implemented here — only the skeleton and pipeline every later story builds on. Resist the temptation to build ahead into Story 1.1+ scope.
- **Module boundary discipline starts now (AD-1, AD-2, AD-3):** `app/` route/UI code must never query Postgres directly — only through a module's service layer under `lib/modules/*`. Even though the modules are empty stubs in this story, do not add any Drizzle query calls directly inside `app/`. This constraint governs every future story, so the scaffold's folder boundaries must make the "right" pattern the only reachable one.
  [Source: architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-1, #AD-2, #AD-3]
- **Auth session strategy is a hard requirement, not a config default (AD-6):** Better Auth must be configured for **database-backed sessions**, explicitly not stateless JWT. This is why AD-4 (Admin role revoke, Story 1.4) can take effect on the very next request instead of waiting for a token to expire. Get this right at scaffold time — changing session strategy later means migrating live sessions.
  [Source: architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-6]
- **Do not build `requireRole()`/`can()` yet.** AD-6 defines these as the one shared authorization pair every module must use, but they depend on the role model (Story 1.3) which doesn't exist yet. This story only needs Better Auth's provider/session config to work end-to-end; the shared helpers land in Story 1.3.
- **i18n contract (AD-9):** UI strings live only in `en.json`/`ar.json` next-intl catalogs — never hard-coded per component, never per-locale DB columns (that pattern is reserved for `Course.contentLanguage` in Epic 2, a completely different concern). `dir="rtl"` is driven off the active locale at the root layout level so it cascades correctly.
  [Source: architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-9]
- **Design tokens are the single source of truth (UX-DR1).** Every color, typography, spacing, and radius value used anywhere in the app must trace back to a DESIGN.md token via the Tailwind theme config — never a one-off hex code or px value in a component. This is what makes light/dark mode and future RTL work consistent instead of ad hoc per surface.
  [Source: ux-designs/ux-BMAD Test-2026-08-02/DESIGN.md frontmatter (colors, typography, rounded, spacing)]
- **Environments (AD-12):** exactly one production environment (Vercel + Neon primary branch). Every PR gets a Vercel preview deploy wired to an ephemeral Neon branch (schema+data fork of primary), torn down on merge/close. This is infrastructure plumbing, not a "nice to have" — later stories assume it exists (e.g., Story 1.0's own ACs #6/#7 test it directly).
  [Source: architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-12; SOLUTION-DESIGN.md §7]
- **Consistency conventions to establish now** (affects every schema/action written from here forward): camelCase for TS identifiers, snake_case for DB columns (Drizzle's default mapping); IDs are UUIDv7 (time-sortable) on every table; timestamps are UTC `timestamptz`; a Server Action never throws across the client boundary — it returns a discriminated union `{ok: true, data} | {ok: false, error: {code, message}}`.
  [Source: architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#Consistency-Conventions]
- **Stack (verified August 2026 per Architecture; confirm current patch versions at implementation time):**

  | Layer | Choice |
  | --- | --- |
  | Framework | Next.js 16, App Router, React 19 (fallback: 15.5 Maintenance LTS if a v16-specific issue blocks launch) |
  | Language | TypeScript 5.x |
  | Styling | Tailwind CSS v4 + shadcn/ui component source |
  | ORM | Drizzle ORM, latest stable |
  | Database | Postgres 17 on Neon (serverless, scale-to-zero, branching) |
  | Auth | Better Auth, latest stable (email/password + Google + GitHub OAuth, DB-backed sessions) |
  | i18n | next-intl, latest stable (App Router, RTL/ICU support) |
  | Deployment | Vercel |

  [Source: architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#Stack; SOLUTION-DESIGN.md §2]
  - Web check (Aug 2026): Next.js 16 stable line is at 16.2.x (16.2.6 released May 2026) with a July 2026 security release and 16.3 in preview/canary — install `next@16` and take the current 16.2.x patch, including the July 2026 security fix. [Sources: [Next.js 16 blog](https://nextjs.org/blog/next-16), [July 2026 Security Release](https://nextjs.org/blog/july-2026-security-release)]
  - Better Auth's Drizzle adapter supports relational joins from v1.4.0 onward via `experimental.joins: true` in the auth config — worth enabling now since Accounts (Story 1.1+) will query User/Session/Role together. [Source: [Better Auth Drizzle Adapter docs](https://better-auth.com/docs/adapters/drizzle)]
- **Do NOT commit real OAuth secrets or database credentials.** All connection strings and provider credentials are environment variables, sourced from `.env.local` (gitignored) locally and from Vercel/Neon's own env injection in CI/preview/production.

### Project Structure Notes

- This story establishes the source tree from scratch — there is no existing structure to reconcile against yet. Subsequent stories must follow the layout below; do not introduce parallel/competing structures (e.g., a second db client, a second i18n config).
- Target source tree (per Architecture; create these directories now, most as empty stubs that later stories populate):

  ```text
  sanabel/
    app/
      [locale]/                     # next-intl locale segment (en | ar)
        (marketing)/                # public: home, browse, course detail (pre-signup)
        (learner)/                  # authenticated learner surfaces
        (instructor)/               # Instructor-only surfaces
        (admin)/                    # Admin-only surfaces
      api/                          # webhook + upload Route Handlers
    lib/
      modules/
        accounts/                   # User, Session, Role
        course-authoring/           # Course, Module, Lesson
        learning-experience/        # Enrollment, Progress, Attempt, completion
        certificates/               # Certificate issuance + PDF render
        discussion/                 # Comment
        ratings/                    # Rating
        moderation/                 # soft-delete/removal actions
        code-execution/             # Code Execution Service contract
      auth/                         # Better Auth config
      db/                           # Drizzle client, schema barrel, migrations config
      i18n/                         # next-intl config, en.json/ar.json
    emails/                         # React Email templates (Resend) — stub dir only
    drizzle/                        # generated migrations
  ```

  [Source: architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#Structural-Seed; SOLUTION-DESIGN.md §8]
- No conflicts to reconcile — this is a greenfield scaffold with no prior codebase.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-1.0] — full story text and acceptance criteria (verbatim origin of this story's ACs)
- [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/ARCHITECTURE-SPINE.md#AD-1, #AD-2, #AD-3, #AD-6, #AD-9, #AD-12, #Consistency-Conventions, #Stack, #Structural-Seed]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-BMAD Test-2026-08-02/SOLUTION-DESIGN.md#2, #7, #8]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-BMAD Test-2026-08-02/DESIGN.md] frontmatter (`colors`, `typography`, `rounded`, `spacing`) and "Brand & Style" section (light/dark mode, system `prefers-color-scheme` default)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- `npx create-next-app@latest` scaffolded into a throwaway `scaffold-tmp/` dir (target dir naming rules reject leading underscores) then moved into the repo root, since the project root already contained non-empty planning directories (`_bmad`, `_bmad-output`, `docs`, `.claude`).
- `npx shadcn@latest init -d --yes` installed cleanly on top; resulting `style: "base-nova"` uses Base UI primitives + CVA, not Radix.
- Better Auth's Drizzle adapter no longer accepts `experimental.joins` (removed/stabilized since the version referenced in Dev Notes) and `advanced.generateId` moved to `advanced.database.generateId` — both fixed by reading `node_modules/@better-auth/*/dist/*.d.mts` directly, since installed `better-auth@1.6.25` is newer than the Dev Notes' cited docs.
- `@better-auth/cli generate` produced the `user/session/account/verification` Drizzle schema (owned by the `accounts` module per AD-2); `drizzle-kit generate` then produced the first real migration (`drizzle/0000_lyrical_random.sql`, 4 tables) — AC #2's "even if still-empty schema" ended up non-empty because Better Auth's own tables exist from Task 3 onward, which is expected and not a scope violation.
- Next.js 16.2.12 deprecated the `middleware.ts` convention in favor of `proxy.ts` (build emitted a deprecation warning); renamed with no behavior change.
- Verified `/en` and `/ar` both render (curl + headless browser check): `dir="ltr"`/`dir="rtl"` switch correctly, translated strings load, and the primary/secondary/accent color tokens plus the `display`/`body`/`label` typography roles all resolve from `app/globals.css`'s DESIGN.md-derived `@theme` block.
- Verified Better Auth wiring end-to-end by hitting `GET /api/auth/get-session` on the dev server (200, `null` body — correct with no session cookie present), proving the Drizzle adapter + route handler + config compose without runtime errors even against a placeholder `DATABASE_URL`.

### Completion Notes List

- Tasks 1–6 are fully implemented and verified: `npm run build`, `npx tsc --noEmit`, and `npm run lint` all pass clean; both locales statically prerender; light/dark tokens confirmed in compiled CSS.
- Task 2 confirmed end-to-end against a real Neon Postgres 17 project (Ahmed created it and set the real `DATABASE_URL` in `.env.local`): `npm run db:migrate` applied the initial migration successfully, and a live query confirmed all 4 tables (`user`/`session`/`account`/`verification`) exist. Also re-verified the dev server against this real DB — `/en` and `/api/auth/get-session` both return 200.
- **Blocked — two items still need Ahmed's action, since they require his GitHub/Vercel accounts:**
  1. **Task 7** (CI + Vercel/Neon preview branching): `.github/workflows/ci.yml` is authored and will run automatically once this repo is pushed to GitHub (repo created at github.com/Ahmed-Mahmoud0/sanabel). Connecting the repo to Vercel and adding the Neon Vercel integration both happen in web dashboards under Ahmed's own accounts — see the "Deployment" section in `README.md` for the exact steps.
  2. **Task 8** (production deploy): same constraint — deploying `main` to Vercel production requires Ahmed's Vercel account.
- No git commits were made yet (repo was `git init`'d locally only, per the "only commit when asked" rule); the GitHub repo (github.com/Ahmed-Mahmoud0/sanabel) exists but nothing has been pushed to it yet — awaiting Ahmed's explicit go-ahead to commit and push.
- Story Status is left as `in-progress` rather than `review` per Step 9's HALT condition (incomplete tasks) — one more pass needed once Tasks 7–8 are resolved.

### File List

- `package.json`, `package-lock.json` — deps: next, react, react-dom, drizzle-orm, @neondatabase/serverless, drizzle-kit, better-auth, next-intl, uuid, dotenv, shadcn/Tailwind toolchain; added `db:generate`/`db:migrate`/`db:studio` scripts
- `next.config.ts` — wrapped with `next-intl/plugin`
- `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs` — create-next-app defaults (unmodified beyond scaffold)
- `components.json` — shadcn/ui config
- `components/ui/button.tsx`, `lib/utils.ts` — shadcn/ui base primitive + helper
- `proxy.ts` — next-intl locale-routing middleware (renamed from `middleware.ts` per Next 16.2 convention)
- `drizzle.config.ts` — Drizzle Kit config, loads `.env.local`
- `drizzle/0000_lyrical_random.sql`, `drizzle/meta/0000_snapshot.json`, `drizzle/meta/_journal.json` — initial migration (Better Auth's user/session/account/verification tables)
- `lib/db/client.ts` — Drizzle Neon HTTP client
- `lib/db/schema.ts` — schema barrel, re-exports `lib/modules/accounts/schema.ts`
- `lib/db/id.ts` — UUIDv7 `generateId()` helper (Consistency Conventions)
- `lib/modules/accounts/schema.ts` — Better Auth's Drizzle schema (user/session/account/verification), generated via `@better-auth/cli`
- `lib/modules/{course-authoring,learning-experience,certificates,discussion,ratings,moderation,code-execution}/index.ts` — empty module stubs
- `lib/auth/config.ts` — Better Auth server config (Drizzle adapter, DB-backed sessions, email/password + Google/GitHub OAuth, UUIDv7 id generation)
- `lib/auth/client.ts` — Better Auth React client
- `app/api/auth/[...all]/route.ts` — Better Auth Next.js route handler
- `lib/i18n/routing.ts`, `lib/i18n/navigation.ts`, `lib/i18n/request.ts` — next-intl config
- `lib/i18n/en.json`, `lib/i18n/ar.json` — message catalogs
- `app/[locale]/layout.tsx` — root layout: locale validation, `lang`/`dir` switching, Inter/IBM Plex Sans Arabic/JetBrains Mono fonts, `NextIntlClientProvider`
- `app/[locale]/(marketing)/page.tsx` — placeholder home page proving i18n + design tokens end-to-end
- `app/[locale]/(learner)/my-learning/page.tsx`, `app/[locale]/(instructor)/courses/page.tsx`, `app/[locale]/(admin)/moderation/page.tsx` — placeholder route-group pages
- `app/globals.css` — DESIGN.md tokens (colors, typography, radius, spacing) wired into Tailwind v4 `@theme`, with light/dark via `prefers-color-scheme` + `.dark`/`.light` override classes
- `emails/index.ts` — stub dir for future React Email templates
- `.env.example` — documented required env vars
- `.env.local` — local placeholder values (gitignored, not committed)
- `.github/workflows/ci.yml` — CI: lint, typecheck, build on PR/push
- `README.md` — replaced create-next-app boilerplate with real setup + deployment instructions
- `.git/` — repo initialized locally (`git init`, `main` branch), no commits made

## Change Log

| Date | Change |
| --- | --- |
| 2026-08-03 | Tasks 1–6 implemented and verified (Next.js 16 scaffold, Drizzle+Neon config, Better Auth, next-intl, DESIGN.md tokens, module directories). Tasks 7–8 blocked pending Ahmed's GitHub/Vercel/Neon account setup — see Completion Notes. |
| 2026-08-03 | Task 2 fully verified: Ahmed provisioned a real Neon project, migration applied successfully, tables confirmed live. GitHub repo created (github.com/Ahmed-Mahmoud0/sanabel), not yet pushed. |
