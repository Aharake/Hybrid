// RevenueCat wiring — ships safely before a RevenueCat project exists (same
// "configured or no-op" pattern as Google Sign-In in authStore.ts). Until
// EXPO_PUBLIC_REVENUECAT_*_KEY env vars are set, isRevenueCatConfigured is
// false and every action here is a silent no-op, so the rest of the app
// (including the Paywall) works exactly as it does today.
import { Linking, Platform } from 'react-native';
import { create } from 'zustand';
import type Purchases from 'react-native-purchases';
import type { CustomerInfo } from 'react-native-purchases';
import type RevenueCatUI from 'react-native-purchases-ui';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

// Must match the entitlement identifier configured in the RevenueCat dashboard.
export const ENTITLEMENT_ID = 'hyvo_pro';

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

function loadPurchasesUI(): typeof RevenueCatUI {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-purchases-ui').default;
}

interface SubscriptionStore {
  configured: boolean;
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  // True once the entitlement for the current user has been looked up (or the
  // lookup failed). The access gate waits for this so a paying user never sees
  // the paywall flash while their account is still being attached.
  checked: boolean;
  configure: () => Promise<void>;
  loginUser: (userId: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  restore: () => Promise<{ ok: boolean; error?: string }>;
  // Presents RevenueCat's dashboard-configured paywall UI (skips it entirely
  // if the "hyvo_pro" entitlement is already active).
  presentPaywall: () => Promise<{ purchased: boolean; restored: boolean; cancelled: boolean; error: boolean }>;
  // Presents RevenueCat's dashboard-configured Customer Center — lets a
  // subscriber manage/cancel or request a refund without leaving the app.
  presentCustomerCenter: () => Promise<void>;
  // Promo codes are App Store offer codes (e.g. 14 days free): iOS shows
  // Apple's own redemption sheet, Android sends them to Google Play's redeem
  // page. Either way the resulting subscription arrives through the store, so
  // the entitlement flips via the customer-info listener / next refresh.
  redeemPromoCode: () => Promise<void>;
}

function deriveIsPro(info: CustomerInfo | null): boolean {
  return Boolean(info?.entitlements.active[ENTITLEMENT_ID]);
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  configured: false,
  isPro: false,
  customerInfo: null,
  checked: false,

  configure: async () => {
    if (!isRevenueCatConfigured || get().configured) return;
    try {
      const Purchases = loadPurchases();
      Purchases.configure({ apiKey: REVENUECAT_KEY! });
      // Purchases made outside our own screens (an offer code redeemed in the
      // App Store, a renewal or expiry) reach the app through this listener.
      Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        set({ customerInfo, isPro: deriveIsPro(customerInfo), checked: true });
      });
      set({ configured: true });
      await get().refreshCustomerInfo();
    } catch {
      // RevenueCat unavailable (e.g. still running in Expo Go) — app keeps working, just un-configured
    }
  },

  loginUser: async (userId) => {
    if (!isRevenueCatConfigured || !get().configured) return;
    // Hold the access gate until this account's entitlement is known.
    set({ checked: false });
    try {
      const Purchases = loadPurchases();
      const { customerInfo } = await Purchases.logIn(userId);
      set({ customerInfo, isPro: deriveIsPro(customerInfo), checked: true });
    } catch {
      // Offline or RevenueCat hiccup — keep whatever the SDK last knew (it
      // caches the signed-in user's info on the device) and let the gate decide.
      set({ checked: true });
    }
  },

  logoutUser: async () => {
    if (!isRevenueCatConfigured || !get().configured) return;
    try {
      await loadPurchases().logOut();
    } catch {
      // no-op if there was never a logged-in RevenueCat user
    }
    set({ customerInfo: null, isPro: false, checked: false });
  },

  refreshCustomerInfo: async () => {
    if (!isRevenueCatConfigured || !get().configured) return;
    try {
      const customerInfo = await loadPurchases().getCustomerInfo();
      set({ customerInfo, isPro: deriveIsPro(customerInfo), checked: true });
    } catch {
      // network error — keep whatever we last knew
      set({ checked: true });
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

  presentPaywall: async () => {
    if (!isRevenueCatConfigured || !get().configured) return { purchased: false, restored: false, cancelled: false, error: true };
    try {
      const result = await loadPurchasesUI().presentPaywallIfNeeded({ requiredEntitlementIdentifier: ENTITLEMENT_ID });
      await get().refreshCustomerInfo();
      return {
        purchased: result === PAYWALL_RESULT.PURCHASED,
        restored: result === PAYWALL_RESULT.RESTORED,
        cancelled: result === PAYWALL_RESULT.CANCELLED,
        error: result === PAYWALL_RESULT.ERROR,
      };
    } catch {
      return { purchased: false, restored: false, cancelled: false, error: true };
    }
  },

  presentCustomerCenter: async () => {
    if (!isRevenueCatConfigured || !get().configured) return;
    try {
      await loadPurchasesUI().presentCustomerCenter();
    } catch {
      // no-op — e.g. no Customer Center configured in the dashboard yet
    }
    await get().refreshCustomerInfo();
  },

  redeemPromoCode: async () => {
    if (!isRevenueCatConfigured || !get().configured) return;
    try {
      if (Platform.OS === 'ios') await loadPurchases().presentCodeRedemptionSheet();
      else await Linking.openURL('https://play.google.com/redeem');
    } catch {
      // sheet couldn't open — nothing to redeem
    }
  },
}));
