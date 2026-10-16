import { Platform } from 'react-native';

// Wording that names the store the person actually bought from. On iPhone the
// app must not mention other platforms (App Store guideline 2.3.10), so each
// build only ever shows its own store's names.
const isIos = Platform.OS === 'ios';

export const STORE_ACCOUNT = isIos ? 'Apple ID' : 'Google Play account';
export const STORE_SUBSCRIPTION_SETTINGS = isIos ? 'Settings → your name → Subscriptions' : 'the Google Play Store → Payments & subscriptions → Subscriptions';
export const STORE_SUBSCRIPTION_SHORT = isIos ? 'App Store subscription settings' : 'Google Play subscription settings';
