import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../lib/requireUser.js';

export async function meRoutes(app: FastifyInstance) {
  app.get('/me', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    reply.send({ id: user.id, email: user.email, name: user.name });
  });

  // Permanently deletes the account and everything tied to it (sessions,
  // program, workout/run history, preferences, subscription record — every
  // relation on User is `onDelete: Cascade`). Does not touch the RevenueCat
  // subscription itself: an active App Store/Play Store subscription keeps
  // billing until the user cancels it there, independent of this account.
  app.delete('/me', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    await prisma.user.delete({ where: { id: user.id } });
    reply.code(204).send();
  });
}
