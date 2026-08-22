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
    const exercise = await prisma.customExercise.create({
      data: { userId: user.id, ...parsed.data },
    });
    reply.code(201).send(exercise);
  });
}
