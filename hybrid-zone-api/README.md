# hybrid-zone-api

Backend for the Hybrid Zone app — Fastify + Prisma (Postgres) + Better Auth,
deployed on Railway. Replaces the "everything resets on relaunch" state the
Expo app currently has (onboarding answers, program, workout logs, run
activities, custom exercises, and overview preferences all persist per user).

## Stack

- **Fastify** — HTTP server
- **Prisma** + **Postgres** — data
- **Better Auth** — email/password auth, session cookies, backed by the same Postgres DB
- **Zod** — request validation

## Local development

1. Copy `.env.example` to `.env` and fill in a local (or Railway) `DATABASE_URL`,
   plus a `BETTER_AUTH_SECRET` (generate one with `openssl rand -base64 32`).
2. Install dependencies:
   ```
   npm install
   ```
3. Apply the schema to your database:
   ```
   npm run prisma:migrate
   ```
4. Start the dev server (auto-restarts on file changes):
   ```
   npm run dev
   ```
   The API listens on `http://localhost:4000` (or `$PORT`).

## Deploying to Railway

1. **Create the Postgres database** — in your Railway project, "New" → "Database" → "Add PostgreSQL". Railway auto-generates a `DATABASE_URL` variable for it.
2. **Create the API service** — "New" → "GitHub Repo" (push this directory to a repo first) or "Empty Service" + Railway CLI (`railway up`).
3. **Link the database to the API service** and set these variables on the API service (Settings → Variables):
   - `DATABASE_URL` — reference the Postgres service's `DATABASE_URL` (Railway lets you reference another service's variable directly)
   - `BETTER_AUTH_SECRET` — a random 32+ char string (generate with `openssl rand -base64 32`, keep it secret, never reuse the local dev one in production)
   - `BETTER_AUTH_URL` — the public domain Railway assigns this service (Settings → Networking → "Generate Domain"), e.g. `https://hybrid-zone-api-production.up.railway.app`
   - `CORS_ORIGINS` — comma-separated origins allowed to call this API (your Expo app's dev tunnel URL and whatever it's served from in production)
4. Railway builds via Nixpacks (see `railway.json`), running `npm run build` (`tsc` + `prisma generate`) then the start command, which runs `prisma migrate deploy` before booting the server — so every deploy automatically applies any new migrations.
5. Health check: `GET /health` → `{ ok: true }`.

## API surface

All routes below (except `/api/auth/*` and `/health`) require a valid Better
Auth session and only ever read/write the calling user's own data.

```
POST   /api/auth/sign-up/email
POST   /api/auth/sign-in/email
POST   /api/auth/sign-out
GET    /api/auth/get-session
...    (full Better Auth route set mounted under /api/auth/*)

GET    /api/me

GET    /api/onboarding-answers
PUT    /api/onboarding-answers

GET    /api/program
PUT    /api/program          (full replace — client sends the whole program)

GET    /api/workout-logs
POST   /api/workout-logs

GET    /api/run-activities
POST   /api/run-activities
DELETE /api/run-activities/:id

GET    /api/custom-exercises
POST   /api/custom-exercises

GET    /api/preferences
PUT    /api/preferences
```

## Data model

See `prisma/schema.prisma`. `User`/`Session`/`Account`/`Verification` are
Better Auth's own tables — if you add social login providers or plugins
later, regenerate/diff those against `npx @better-auth/cli generate` rather
than hand-editing them further. Everything else (`OnboardingAnswers`,
`Program`, `TrainingSession`, `Exercise`, `WorkoutLog`, `LoggedSet`,
`RunActivity`, `CustomExercise`, `Preferences`) mirrors the Expo app's
`onboardingStore`/`trackerStore` shapes directly.

## Not included yet

- Social login (Apple/Google Sign-In)
- Push notifications
- Analytics
- Real subscription billing / Cloud Functions equivalent (e.g. App Store /
  RevenueCat webhook handling) — `planTier`/`subscriptionStatus` on `User`
  are just fields for now, nothing validates them against a real payment
  provider.
