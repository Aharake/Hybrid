import type { FastifyInstance } from 'fastify';
import { requireUser } from '../lib/requireUser.js';

export async function meRoutes(app: FastifyInstance) {
  app.get('/me', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    reply.send({ id: user.id, email: user.email, name: user.name });
  });
}
