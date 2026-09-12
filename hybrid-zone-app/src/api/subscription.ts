import { apiFetchJson } from './client';

export interface SubscriptionResponse {
  id: string;
  userId: string;
  entitlementId: string;
  isActive: boolean;
  productId: string | null;
  store: string | null;
  expiresAt: string | null;
}

export async function getSubscription(): Promise<SubscriptionResponse | null> {
  return apiFetchJson<SubscriptionResponse | null>('/api/subscription', { method: 'GET' });
}
