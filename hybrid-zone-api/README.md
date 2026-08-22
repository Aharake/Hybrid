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
   Google sign-in vars (`GOOGLE_CLIENT_ID_WEB`, `GOOGLE_CLIENT_ID_IOS`,
   `GOOGLE_CLIENT_ID_ANDROID`, `GOOGLE_CLIENT_SECRET`) are optional — Google
   sign-in is simply disabled until they're set. See "Google Sign-In setup" below.
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

## Google Sign-In setup

The Expo app signs in with Google natively (on-device SDK → ID token →
exchanged with Better Auth), not via an OAuth redirect, so you need OAuth
client IDs registered per platform in Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com) → create a
   project (or use an existing one) → **APIs & Services → Credentials**.
2. **Configure the OAuth consent screen** first if you haven't (External,
   fill in app name + your email — it can stay in "Testing" mode while you
   develop, no Google review needed for that).
3. **Create 3 OAuth client IDs** (Credentials → Create Credentials → OAuth
   client ID):
   - **Web application** — no redirect URIs needed for our flow. This is
     the one with a client *secret*; it's what the server uses to verify
     ID tokens. → gives you a Client ID + Client Secret.
   - **iOS** — Bundle ID: `com.hybridzone.app` (matches `app.json`'s
     `ios.bundleIdentifier` — change both together if you rename it). →
     gives you an iOS Client ID (no secret).
   - **Android** — Package name: `com.hybridzone.app`, plus a SHA-1
     certificate fingerprint. For an EAS development build, get it with
     `eas credentials` (select Android → Development → view/generate a
     keystore, it prints the SHA-1). → gives you an Android Client ID (no
     secret).
4. **Set these on the Railway API service** (Settings → Variables):
   - `GOOGLE_CLIENT_ID_WEB`
   - `GOOGLE_CLIENT_ID_IOS`
   - `GOOGLE_CLIENT_ID_ANDROID`
   - `GOOGLE_CLIENT_SECRET` — the Web client's secret
5. **Set these in the Expo app's `.env`** (see `hybrid-zone-app/.env.example`):
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — same value as `GOOGLE_CLIENT_ID_WEB` above
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — same value as `GOOGLE_CLIENT_ID_IOS` above

Until these are set, the "Continue with Google" button simply doesn't
render — nothing breaks, it's just hidden.

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

- Apple Sign-In (Google Sign-In is wired — see above)
- Health data sync (Apple Health / Google Health)
- Push notifications
- Analytics
- Real subscription billing / Cloud Functions equivalent (e.g. App Store /
  RevenueCat webhook handling) — `planTier`/`subscriptionStatus` on `User`
  are just fields for now, nothing validates them against a real payment
  provider.
