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

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders:
    googleClientIds.length > 0
      ? {
          google: {
            clientId: googleClientIds,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
          },
        }
      : undefined,
  plugins: [bearer()],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
});
