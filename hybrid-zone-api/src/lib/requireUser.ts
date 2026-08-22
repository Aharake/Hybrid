import type { FastifyReply, FastifyRequest } from 'fastify';
import { auth } from './auth.js';

// Validates the incoming request's session cookie/token against Better Auth
// and returns the authenticated user, or sends a 401 and returns null.
// Route handlers should `const user = await requireUser(request, reply); if (!user) return;`
export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }

  const session = await auth.api.getSession({ headers });
  if (!session) {
    reply.code(401).send({ error: 'Unauthorized' });
    return null;
  }
  return session.user;
}
