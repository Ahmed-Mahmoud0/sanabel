# Deferred Work

## Deferred from: code review of story-1-0 (2026-08-03)

- Better Auth's generated `user` schema uses a case-sensitive unique constraint on `email`, allowing duplicate accounts differing only in casing. Real, but sign-up/sign-in flows are Story 1.1's concern, not this scaffold story's. [lib/modules/accounts/schema.ts:7]
- `socialProviders.google`/`.github` in `lib/auth/config.ts` are always registered with `?? ""` fallback credentials rather than omitted when unset, so an attempted social sign-in with no real credentials configured fails unpredictably rather than being cleanly unavailable. Sanctioned by Story 1.0's own Dev Notes ("credentials may be placeholder/dev values at this stage"). [lib/auth/config.ts:20-29]
- `.github/workflows/ci.yml` injects `DATABASE_URL`/`BETTER_AUTH_SECRET`/OAuth secrets as plain env vars into the `npm run build` step with no isolation from third-party code run during `npm ci` — a generic CI supply-chain risk category, not specific to this scaffold, out of scope for a foundation story.
- The `sanabel` GitHub repo is public, so PRs opened from forks won't receive the repo's GitHub Actions secrets by default and their CI runs will fail on `npm run build`. Zero current impact — solo-maintained repo, not yet accepting external contributions.
- `proxy.ts`'s middleware matcher excludes any path merely prefixed with `api`/`trpc`/`_next`/`_vercel` (e.g. a hypothetical `/api-docs` route) rather than requiring an exact path segment. Zero current impact since no such conflicting routes exist yet. [proxy.ts:7]
