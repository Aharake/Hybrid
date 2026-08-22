import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { auth } from './lib/auth.js';
import { onboardingAnswersRoutes } from './routes/onboardingAnswers.js';
import { programRoutes } from './routes/program.js';
import { workoutLogsRoutes } from './routes/workoutLogs.js';
import { runActivitiesRoutes } from './routes/runActivities.js';
import { customExercisesRoutes } from './routes/customExercises.js';
import { preferencesRoutes } from './routes/preferences.js';
import { meRoutes } from './routes/me.js';

const app = Fastify({ logger: true });

const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

await app.register(cors, {
  origin: allowedOrigins,
  credentials: true,
});

// Registered as its own encapsulated plugin so the raw-buffer content-type
// parser below only applies to routes registered inside this scope — it must
// NOT leak out and break Fastify's default JSON parsing for the app's own
// routes registered further down.
app.register(async (authScope) => {
  // Better Auth's handler expects to build its own Fetch API Request from the
  // raw body (it does its own parsing) — capture the body as a Buffer instead
  // of letting Fastify's default JSON parser consume/reshape it first.
  authScope.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });

  authScope.all('/api/auth/*', async (request, reply) => {
    const url = new URL(request.url, `${request.protocol}://${request.hostname}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === 'string') headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(', '));
    }

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const fetchRequest = new Request(url, {
      method: request.method,
      headers,
      body: hasBody ? (request.body as Buffer) : undefined,
    });

    const response = await auth.handler(fetchRequest);

    reply.status(response.status);
    response.headers.forEach((value, key) => reply.header(key, value));
    const text = await response.text();
    reply.send(text);
  });
});

// The rest of the app's own routes use Fastify's normal (parsed) JSON body —
// Prisma data endpoints, all auth-protected via requireUser().
app.register(meRoutes, { prefix: '/api' });
app.register(onboardingAnswersRoutes, { prefix: '/api' });
app.register(programRoutes, { prefix: '/api' });
app.register(workoutLogsRoutes, { prefix: '/api' });
app.register(runActivitiesRoutes, { prefix: '/api' });
app.register(customExercisesRoutes, { prefix: '/api' });
app.register(preferencesRoutes, { prefix: '/api' });

app.get('/health', async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 4000);
app
  .listen({ port, host: '0.0.0.0' })
  .then(() => app.log.info(`hybrid-zone-api listening on :${port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
