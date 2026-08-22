import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../lib/requireUser.js';

const bodySchema = z.object({
  enabledMetrics: z.record(z.string(), z.record(z.string(), z.boolean())),
});

export async function preferencesRoutes(app: FastifyInstance) {
  app.get('/preferences', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const prefs = await prisma.preferences.findUnique({ where: { userId: user.id } });
    reply.send(prefs);
  });

  app.put('/preferences', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.flatten() });
      return;
    }
    const prefs = await prisma.preferences.upsert({
      where: { userId: user.id },
      create: { userId: user.id, enabledMetrics: parsed.data.enabledMetrics },
      update: { enabledMetrics: parsed.data.enabledMetrics },
    });
    reply.send(prefs);
  });
}
