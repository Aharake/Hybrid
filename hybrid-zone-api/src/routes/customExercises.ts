import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../lib/requireUser.js';

const createSchema = z.object({
  name: z.string().min(1),
  group: z.string().min(1),
});

export async function customExercisesRoutes(app: FastifyInstance) {
  app.get('/custom-exercises', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const exercises = await prisma.customExercise.findMany({ where: { userId: user.id } });
    reply.send(exercises);
  });

  app.post('/custom-exercises', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.flatten() });
      return;
    }
    // Saving a name the account already has returns the existing one instead of
    // adding a duplicate (the app tries to save every typed-in exercise).
    const existing = await prisma.customExercise.findFirst({
      where: { userId: user.id, name: { equals: parsed.data.name.trim(), mode: 'insensitive' } },
    });
    if (existing) {
      reply.send(existing);
      return;
    }
    const exercise = await prisma.customExercise.create({
      data: { userId: user.id, name: parsed.data.name.trim(), group: parsed.data.group },
    });
    reply.code(201).send(exercise);
  });
}
