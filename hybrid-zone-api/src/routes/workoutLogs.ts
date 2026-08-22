import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../lib/requireUser.js';

const setSchema = z.object({
  exerciseId: z.string().nullable().optional(),
  exerciseName: z.string(),
  reps: z.number().int(),
  weight: z.number(),
});

const createSchema = z.object({
  trainingSessionId: z.string().nullable().optional(),
  sessionKey: z.string(),
  date: z.string().datetime().optional(),
  sets: z.array(setSchema),
});

export async function workoutLogsRoutes(app: FastifyInstance) {
  app.get('/workout-logs', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const logs = await prisma.workoutLog.findMany({
      where: { userId: user.id },
      include: { loggedSets: true },
      orderBy: { date: 'desc' },
    });
    reply.send(logs);
  });

  app.post('/workout-logs', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.flatten() });
      return;
    }
    const { trainingSessionId, sessionKey, date, sets } = parsed.data;
    const log = await prisma.workoutLog.create({
      data: {
        userId: user.id,
        trainingSessionId: trainingSessionId ?? undefined,
        sessionKey,
        date: date ? new Date(date) : undefined,
        loggedSets: { create: sets },
      },
      include: { loggedSets: true },
    });
    reply.code(201).send(log);
  });
}
