# Sanabel

Free, bilingual (English/Arabic) platform for learning to code.

## Stack

Next.js 16 (App Router, React 19) · TypeScript · Tailwind CSS v4 + shadcn/ui · Drizzle ORM · Postgres 17 (Neon) · Better Auth · next-intl · Vercel.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in real values, see below
npm run dev
```

Open [http://localhost:3000/en](http://localhost:3000/en) or [http://localhost:3000/ar](http://localhost:3000/ar).

### Environment variables

See `.env.example`. `DATABASE_URL` must point at a real Postgres 17 instance (a free [Neon](https://neon.tech) project works) before `npm run db:migrate` will succeed. `BETTER_AUTH_SECRET` should be a random 32+ char string (`openssl rand -base64 32`). The Google/GitHub OAuth vars can stay blank in local dev — email/password auth still works without them. `RESEND_API_KEY` is required for verification/password-reset emails to send — get a free key at [resend.com](https://resend.com); `EMAIL_FROM` can stay at the Resend sandbox sender (`onboarding@resend.dev`) until a custom domain is verified.

#### Social login (Google & GitHub)

Optional for local dev — sign-up/sign-in still work with email/password if these are left blank. To enable "Continue with Google" / "Continue with GitHub":

1. **Google:** create an OAuth 2.0 Client ID at [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (Application type: Web application). Add an Authorized redirect URI of `{BETTER_AUTH_URL}/api/auth/callback/google` — e.g. `http://localhost:3000/api/auth/callback/google` for local dev, plus the production URL's equivalent. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
2. **GitHub:** create an OAuth App at [GitHub Developer Settings](https://github.com/settings/developers). Set its "Authorization callback URL" to `{BETTER_AUTH_URL}/api/auth/callback/github`. Set `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.
3. Set the same four values in Vercel's project environment variables (Production, and Preview if you want social login to work there too) and in GitHub Actions secrets if CI needs them.

**Known gap:** Vercel preview URLs are per-deploy and dynamic, so they can't be pre-registered as OAuth redirect URIs — social login realistically only works on `localhost` and the production URL, not on PR previews.

### Database

```bash
npm run db:generate   # regenerate drizzle/ migrations from lib/db/schema.ts
npm run db:migrate     # apply migrations to DATABASE_URL
npm run db:studio      # browse the database
```

## Deployment

- **Production:** https://sanabel-six.vercel.app (Vercel, wired to the Neon primary branch)
- **CI:** GitHub Actions runs lint/typecheck/build on every PR and push to `main` — see `.github/workflows/ci.yml`
- **Repo:** https://github.com/Ahmed-Mahmoud0/sanabel

### One-time setup (already done for this repo — reference if you're forking or rebuilding this pipeline elsewhere)

1. **Push to GitHub.**
   ```bash
   gh repo create sanabel --private --source=. --remote=origin
   git push -u origin main
   ```
2. **Create a Neon project** at [neon.tech](https://neon.tech) (Postgres 17, primary branch = production).
3. **Import into Vercel** at [vercel.com/new](https://vercel.com/new), pointing at the GitHub repo.
4. **Add the Neon Vercel integration** ([vercel.com/integrations/neon](https://vercel.com/integrations/neon)) and connect it to the project above. This makes every PR provision an ephemeral Neon branch (schema+data fork of primary) and injects its `DATABASE_URL` into that PR's preview environment automatically — see the note below on teardown.
5. In the Vercel project's environment variables, set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the production URL), and the Google/GitHub OAuth client id/secret pairs for Production (and Preview, if you want social login to work on previews).
6. In GitHub repo settings → Secrets and variables → Actions, add `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GH_OAUTH_CLIENT_ID`, `GH_OAUTH_CLIENT_SECRET` so `.github/workflows/ci.yml` can build on PRs. Only `DATABASE_URL` is strictly required for the build to succeed; the others silently default to blank/unset.
7. Push to `main` — Vercel deploys it to production against the Neon primary branch.

**Known gap:** the Neon ephemeral preview branch is *not* confirmed to be automatically torn down when a PR is closed or merged — verified via a real test PR that the branch is created correctly, but closing the PR (and deleting its branch) left the Neon branch listed with suspended/idle compute rather than deleted. See Story 1.0's Task 7 notes in `_bmad-output/implementation-artifacts/1-0-project-scaffold-deployment-pipeline.md` for follow-up.
