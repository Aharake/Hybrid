import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../lib/requireUser.js';

const bodySchema = z.object({
  enabledMetrics: z.record(z.string(), z.record(z.string(), z.boolean())).optional(),
  settings: z
    .object({
      unitSystem: z.enum(['metric', 'imperial']).optional(),
      restDuration: z.number().int().min(15).max(600).optional(),
      runType: z.enum(['open', 'distance', 'interval']).optional(),
      distanceGoal: z.number().min(1).max(100).optional(),
      // Order of the overview tiles per page, e.g. { home: ['burn', 'steps'] }.
      metricOrder: z.record(z.string(), z.array(z.string().max(40)).max(40)).optional(),
      // What counts toward the Weekly Goal ring, and the daily step target.
      weeklyGoal: z
        .object({
          onboarded: z.boolean(),
          includeRun: z.boolean(),
          includeSteps: z.boolean(),
          stepGoal: z.number().int().min(1000).max(50000),
        })
        .optional(),
    })
    .optional(),
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
    const { enabledMetrics, settings } = parsed.data;
    const existing = await prisma.preferences.findUnique({ where: { userId: user.id } });
    // Partial updates: a save that only carries `settings` must not wipe the
    // metric toggles, and vice versa. Settings are merged key by key.
    const mergedSettings = settings ? { ...((existing?.settings as object | null) ?? {}), ...settings } : undefined;
    const prefs = await prisma.preferences.upsert({
      where: { userId: user.id },
      create: { userId: user.id, enabledMetrics: enabledMetrics ?? {}, settings: mergedSettings },
      update: { ...(enabledMetrics ? { enabledMetrics } : {}), ...(mergedSettings ? { settings: mergedSettings } : {}) },
    });
    reply.send(prefs);
  });
}
