import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../lib/requireUser.js';

const bodySchema = z.object({
  strengthExp: z.string().nullable().optional(),
  runningExp: z.string().nullable().optional(),
  strengthGoal: z.string().nullable().optional(),
  equipment: z.string().nullable().optional(),
  focus: z.string().nullable().optional(),
  split: z.string().nullable().optional(),
  runningGoal: z.string().nullable().optional(),
  includeRunning: z.boolean().optional(),
  schedule: z.record(z.string(), z.any()).nullable().optional(),
  planTier: z.string().nullable().optional(),
});

export async function onboardingAnswersRoutes(app: FastifyInstance) {
  app.get('/onboarding-answers', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const answers = await prisma.onboardingAnswers.findUnique({ where: { userId: user.id } });
    reply.send(answers);
  });

  // Full upsert — the client always sends its whole local answers object.
  app.put('/onboarding-answers', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.flatten() });
      return;
    }
    const { schedule, ...rest } = parsed.data;
    const scheduleData = schedule === undefined ? {} : { schedule: schedule === null ? Prisma.JsonNull : schedule };
    const answers = await prisma.onboardingAnswers.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...rest, ...scheduleData },
      update: { ...rest, ...scheduleData },
    });
    reply.send(answers);
  });
}
