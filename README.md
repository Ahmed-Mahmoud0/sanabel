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

See `.env.example`. `DATABASE_URL` must point at a real Postgres 17 instance (a free [Neon](https://neon.tech) project works) before `npm run db:migrate` will succeed. `BETTER_AUTH_SECRET` should be a random 32+ char string (`openssl rand -base64 32`). The Google/GitHub OAuth vars can stay blank in local dev — email/password auth still works without them.

### Database

```bash
npm run db:generate   # regenerate drizzle/ migrations from lib/db/schema.ts
npm run db:migrate     # apply migrations to DATABASE_URL
npm run db:studio      # browse the database
```

## Deployment (manual setup, one-time)

This repo isn't connected to GitHub/Vercel/Neon yet. To finish wiring the pipeline described in Story 1.0:

1. **Push to GitHub.** Create a repo and push this branch:
   ```bash
   gh repo create sanabel --private --source=. --remote=origin
   git push -u origin main
   ```
2. **Create a Neon project** at [neon.tech](https://neon.tech) (Postgres 17, primary branch = production).
3. **Import into Vercel** at [vercel.com/new](https://vercel.com/new), pointing at the GitHub repo.
4. **Add the Neon Vercel integration** ([vercel.com/integrations/neon](https://vercel.com/integrations/neon)) and connect it to the project above. This makes every PR provision an ephemeral Neon branch (schema+data fork of primary) and injects its `DATABASE_URL` into that PR's preview environment automatically, torn down on merge/close — no extra CI step needed.
5. In the Vercel project's environment variables, set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (the production URL), and the Google/GitHub OAuth client id/secret pairs for Production (and Preview, if you want social login to work on previews).
6. In GitHub repo settings → Secrets and variables → Actions, add `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GH_OAUTH_CLIENT_ID`, `GH_OAUTH_CLIENT_SECRET` so `.github/workflows/ci.yml` can build on PRs.
7. Push to `main` — Vercel deploys it to production against the Neon primary branch.
