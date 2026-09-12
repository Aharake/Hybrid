import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

// RevenueCat calls this directly (not through the app's own auth) whenever a
// subscription event happens, so the backend stays in sync even if the user
// never reopens the app. Configure the webhook URL + this same secret as a
// custom "Authorization" header value in the RevenueCat dashboard
// (Project Settings -> Integrations -> Webhooks).
const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET;

const eventSchema = z.object({
  type: z.string(),
  app_user_id: z.string(),
  entitlement_ids: z.array(z.string()).optional(),
  product_id: z.string().optional(),
  store: z.string().optional(),
  expiration_at_ms: z.number().nullable().optional(),
});

const payloadSchema = z.object({ event: eventSchema });

// Event types that mean the entitlement is no longer active, regardless of
// expiration_at_ms (RevenueCat sends CANCELLATION when auto-renew is turned
// off, but the entitlement usually stays active until expiration — EXPIRATION
// is the one that means access has actually ended).
const INACTIVE_EVENT_TYPES = new Set(['EXPIRATION']);

export async function revenueCatWebhookRoutes(app: FastifyInstance) {
  app.post('/revenuecat/webhook', async (request, reply) => {
    if (!WEBHOOK_SECRET || request.headers.authorization !== WEBHOOK_SECRET) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const parsed = payloadSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.flatten() });
      return;
    }
    const { event } = parsed.data;

    // app_user_id is whatever we passed to Purchases.logIn() client-side —
    // our own User.id. If it doesn't match a known user (e.g. a purchase
    // made before login, under RevenueCat's anonymous id), there's nothing
    // to record yet — just acknowledge the event.
    const user = await prisma.user.findUnique({ where: { id: event.app_user_id } });
    if (!user) {
      reply.code(200).send({ ok: true, skipped: true });
      return;
    }

    const entitlementId = event.entitlement_ids?.[0] ?? 'pro';
    const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
    const isActive = !INACTIVE_EVENT_TYPES.has(event.type) && (!expiresAt || expiresAt.getTime() > Date.now());

    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        entitlementId,
        isActive,
        productId: event.product_id,
        store: event.store,
        expiresAt,
      },
      update: {
        entitlementId,
        isActive,
        productId: event.product_id,
        store: event.store,
        expiresAt,
      },
    });

    reply.code(200).send({ ok: true });
  });
}
