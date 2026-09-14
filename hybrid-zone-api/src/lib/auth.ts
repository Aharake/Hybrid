import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins/bearer';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma.js';

// The bearer plugin lets the Expo app authenticate with an
// `Authorization: Bearer <token>` header instead of a cookie jar — React
// Native's fetch has no cookie storage, so cookie-based sessions (Better
// Auth's default) don't work there. Sign-up/sign-in responses carry the
// token in a `set-auth-token` response header; the client stores it and
// sends it back on every subsequent request.
//
// Google sign-in uses the native "ID token" flow, not the OAuth redirect
// flow: the Expo app signs in on-device with @react-native-google-signin,
// gets an idToken, and sends it to POST /api/auth/sign-in/social
// ({ provider: 'google', idToken: { token } }). Better Auth verifies that
// token's audience against `clientId` here — which is why clientId is an
// array of every OAuth client (web, iOS, Android) registered in Google
// Cloud Console for this project, not just one. Only the web client has a
// secret; iOS/Android native clients don't.
const googleClientIds = [
  process.env.GOOGLE_CLIENT_ID_WEB,
  process.env.GOOGLE_CLIENT_ID_IOS,
  process.env.GOOGLE_CLIENT_ID_ANDROID,
].filter((id): id is string => Boolean(id));

// Apple sign-in uses the same native "ID token" flow as Google above: the
// Expo app signs in on-device with expo-apple-authentication and sends the
// resulting identityToken straight to POST /api/auth/sign-in/social
// ({ provider: 'apple', idToken: { token } }) — no OAuth redirect/web flow,
// so no clientSecret is ever needed here. The native identityToken's `aud`
// claim is the app's iOS bundle identifier (not an Apple "Services ID"),
// which is why appBundleIdentifier is set instead of relying on clientId
// for audience verification; clientId is still required by the type but is
// only actually used if the (unused) web OAuth code flow is invoked.
const appleBundleId = process.env.APPLE_BUNDLE_IDENTIFIER;

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(googleClientIds.length > 0
      ? {
          google: {
            clientId: googleClientIds,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
          },
        }
      : {}),
    ...(appleBundleId
      ? {
          apple: {
            clientId: appleBundleId,
            clientSecret: '', // unused: only the native idToken flow is wired up, never the OAuth code flow
            appBundleIdentifier: appleBundleId,
          },
        }
      : {}),
  },
  plugins: [bearer()],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  advanced: {
    // Better Auth still sets a session cookie by default even though we
    // only use it via the bearer plugin above. iOS/Android's native HTTP
    // stack (which RN's fetch sits on, unlike a browser's fetch) silently
    // persists and resends that cookie — which flips on Better Auth's
    // CSRF/origin-check requirement, and then fails it because native
    // fetch never sends an Origin header (there's no browser origin to
    // send). CSRF protection exists to stop a browser tab on another site
    // from riding a user's cookies to our API — that attack surface
    // doesn't exist for a native app, so it's safe to turn off rather than
    // fight the cookie jar.
    disableCSRFCheck: true,
  },
});
