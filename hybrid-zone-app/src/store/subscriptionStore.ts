// RevenueCat wiring — ships safely before a RevenueCat project exists (same
// "configured or no-op" pattern as Google Sign-In in authStore.ts). Until
// EXPO_PUBLIC_REVENUECAT_*_KEY env vars are set, isRevenueCatConfigured is
// false and every action here is a silent no-op, so the rest of the app
// (including the Paywall) works exactly as it does today.
import { Platform } from 'react-native';
import { create } from 'zustand';
import type Purchases from 'react-native-purchases';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

// The entitlement identifier this app expects to be configured in the
// RevenueCat dashboard once a project exists — attach it to whatever
// product(s) should unlock the "pro" tier.
export const ENTITLEMENT_ID = 'pro';

const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
const REVENUECAT_KEY = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;

export const isRevenueCatConfigured = Boolean(REVENUECAT_KEY);

// react-native-purchases touches a native module as soon as it's imported —
// fine in an EAS dev/production build, but this app is already committed to
// requiring one anyway (GPS/maps). Still loaded lazily so importing this
// file never crashes a stray Expo Go session before that build exists.
function loadPurchases(): typeof Purchases {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-purchases').default;
}

interface SubscriptionStore {
  configured: boolean;
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  loading: boolean;
  error: string | null;
  configure: () => Promise<void>;
  loginUser: (userId: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  loadOfferings: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<{ ok: boolean; cancelled?: boolean; error?: string }>;
  restore: () => Promise<{ ok: boolean; error?: string }>;
}

function deriveIsPro(info: CustomerInfo | null): boolean {
  return Boolean(info?.entitlements.active[ENTITLEMENT_ID]);
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  configured: false,
  isPro: false,
  customerInfo: null,
  currentOffering: null,
  loading: false,
  error: null,

  configure: async () => {
    if (!isRevenueCatConfigured || get().configured) return;
    try {
      const Purchases = loadPurchases();
      Purchases.configure({ apiKey: REVENUECAT_KEY! });
      set({ configured: true });
      await get().refreshCustomerInfo();
    } catch {
      // RevenueCat unavailable (e.g. still running in Expo Go) — app keeps working, just un-configured
    }
  },

  loginUser: async (userId) => {
    if (!isRevenueCatConfigured || !get().configured) return;
    try {
      const Purchases = loadPurchases();
      const { customerInfo } = await Purchases.logIn(userId);
      set({ customerInfo, isPro: deriveIsPro(customerInfo) });
    } catch {
      // best-effort — local auth state is the source of truth regardless
    }
  },

  logoutUser: async () => {
    if (!isRevenueCatConfigured || !get().configured) return;
    try {
      await loadPurchases().logOut();
    } catch {
      // no-op if there was never a logged-in RevenueCat user
    }
    set({ customerInfo: null, isPro: false, currentOffering: null });
  },

  refreshCustomerInfo: async () => {
    if (!isRevenueCatConfigured || !get().configured) return;
    try {
      const customerInfo = await loadPurchases().getCustomerInfo();
      set({ customerInfo, isPro: deriveIsPro(customerInfo) });
    } catch {
      // network error — keep whatever we last knew
    }
  },

  loadOfferings: async () => {
    if (!isRevenueCatConfigured || !get().configured) return;
    set({ loading: true, error: null });
    try {
      const offerings = await loadPurchases().getOfferings();
      set({ currentOffering: offerings.current, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Could not load plans.' });
    }
  },

  purchase: async (pkg) => {
    if (!isRevenueCatConfigured || !get().configured) return { ok: false, error: 'Subscriptions are not set up yet.' };
    try {
      const Purchases = loadPurchases();
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      set({ customerInfo, isPro: deriveIsPro(customerInfo) });
      return { ok: true };
    } catch (err: unknown) {
      const e = err as { userCancelled?: boolean; message?: string };
      if (e?.userCancelled) return { ok: false, cancelled: true };
      return { ok: false, error: e?.message ?? 'Purchase failed. Please try again.' };
    }
  },

  restore: async () => {
    if (!isRevenueCatConfigured || !get().configured) return { ok: false, error: 'Subscriptions are not set up yet.' };
    try {
      const customerInfo = await loadPurchases().restorePurchases();
      set({ customerInfo, isPro: deriveIsPro(customerInfo) });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Restore failed. Please try again.' };
    }
  },
}));
