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
  durationSec: z.number().int().nonnegative().optional(),
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
    const { trainingSessionId, sessionKey, date, durationSec, sets } = parsed.data;
    const log = await prisma.workoutLog.create({
      data: {
        userId: user.id,
        trainingSessionId: trainingSessionId ?? undefined,
        sessionKey,
        durationSec,
        date: date ? new Date(date) : undefined,
        loggedSets: { create: sets },
      },
      include: { loggedSets: true },
    });
    reply.code(201).send(log);
  });

  app.delete('/workout-logs/:id', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const { id } = request.params as { id: string };
    const log = await prisma.workoutLog.findUnique({ where: { id } });
    if (!log || log.userId !== user.id) {
      reply.code(404).send({ error: 'Not found' });
      return;
    }
    await prisma.workoutLog.delete({ where: { id } });
    reply.code(204).send();
  });
}
