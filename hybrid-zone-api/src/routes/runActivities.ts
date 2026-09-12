import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../lib/requireUser.js';

const routePointSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.number(),
});

const createSchema = z.object({
  type: z.string(),
  date: z.string().datetime().optional(),
  distance: z.number(),
  duration: z.string(),
  route: z.array(routePointSchema).nullable().optional(),
});

export async function runActivitiesRoutes(app: FastifyInstance) {
  app.get('/run-activities', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const activities = await prisma.runActivity.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
    });
    reply.send(activities);
  });

  app.post('/run-activities', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.flatten() });
      return;
    }
    const { type, date, distance, duration, route } = parsed.data;
    const activity = await prisma.runActivity.create({
      data: {
        userId: user.id,
        type,
        distance,
        duration,
        date: date ? new Date(date) : undefined,
        route: route === null ? Prisma.JsonNull : route,
      },
    });
    reply.code(201).send(activity);
  });

  app.delete('/run-activities/:id', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const { id } = request.params as { id: string };
    const activity = await prisma.runActivity.findUnique({ where: { id } });
    if (!activity || activity.userId !== user.id) {
      reply.code(404).send({ error: 'Not found' });
      return;
    }
    await prisma.runActivity.delete({ where: { id } });
    reply.code(204).send();
  });
}
