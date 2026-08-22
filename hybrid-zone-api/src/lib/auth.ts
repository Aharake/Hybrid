import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins/bearer';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma.js';

// Email/password only for now — add social providers here later if needed
// (Apple Sign-In is required by App Store review if you ever add any other
// third-party login).
//
// The bearer plugin lets the Expo app authenticate with an
// `Authorization: Bearer <token>` header instead of a cookie jar — React
// Native's fetch has no cookie storage, so cookie-based sessions (Better
// Auth's default) don't work there. Sign-up/sign-in responses carry the
// token in a `set-auth-token` response header; the client stores it and
// sends it back on every subsequent request.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [bearer()],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
});
