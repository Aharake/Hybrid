import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireUser } from '../lib/requireUser.js';

const exerciseSchema = z.object({
  name: z.string(),
  group: z.string(),
  sets: z.number().int(),
  previous: z.number().nullable().optional(),
});

const sessionSchema = z.object({
  key: z.string(),
  day: z.string(),
  duration: z.number().int(),
  exercises: z.array(exerciseSchema),
});

const programSchema = z.object({
  split: z.string(),
  sessions: z.array(sessionSchema),
});

export async function programRoutes(app: FastifyInstance) {
  app.get('/program', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const program = await prisma.program.findUnique({
      where: { userId: user.id },
      include: { sessions: { include: { exercises: true } } },
    });
    reply.send(program);
  });

  // Full replace — simplest correct semantics for a "client owns the whole
  // program" sync model. Swap/add/delete exercise on the client all just PUT
  // the updated program back rather than needing separate fine-grained routes.
  app.put('/program', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = programSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.flatten() });
      return;
    }
    const { split, sessions } = parsed.data;

    const program = await prisma.$transaction(async (tx) => {
      const existing = await tx.program.findUnique({ where: { userId: user.id } });

      const programRecord = existing
        ? await tx.program.update({ where: { id: existing.id }, data: { split } })
        : await tx.program.create({ data: { userId: user.id, split } });

      if (existing) {
        await tx.trainingSession.deleteMany({ where: { programId: existing.id } });
      }

      for (const s of sessions) {
        await tx.trainingSession.create({
          data: {
            programId: programRecord.id,
            key: s.key,
            day: s.day,
            duration: s.duration,
            exercises: { create: s.exercises },
          },
        });
      }

      return tx.program.findUniqueOrThrow({
        where: { id: programRecord.id },
        include: { sessions: { include: { exercises: true } } },
      });
    });

    reply.send(program);
  });
}
