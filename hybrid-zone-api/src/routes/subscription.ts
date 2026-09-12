import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../lib/requireUser.js';

export async function subscriptionRoutes(app: FastifyInstance) {
  // Lets the client check subscription status without depending on the
  // RevenueCat SDK's local cache — useful right after a fresh install/sign-in
  // on a new device, before that cache has synced.
  app.get('/subscription', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } });
    reply.send(subscription);
  });
}
