import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts, typography } from '@/theme/tokens';
import { CheckCircleBigIcon } from '@/icons';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useAuthStore } from '@/store/authStore';
import { API_BASE_URL } from '@/api/client';
import { STORE_ACCOUNT } from '@/engine/storeText';

const FEATURES = [
  'Personalized strength + running plan',
  'Adaptive weekly scheduling',
  'Progress tracking & analytics',
  'Manage or cancel any time in your App Store settings',
];

// Shown in place of the app to anyone who is signed in but has no active Hyvo
// Pro entitlement (trial, subscription or redeemed promo code). Leaves only
// the ways forward: pick a plan, redeem a code, restore, or sign out.
export function SubscriptionGate() {
  const { presentPaywall, restore, redeemPromoCode, refreshCustomerInfo, customerInfo } = useSubscriptionStore();
  const signOut = useAuthStore((s) => s.signOut);
  const [busy, setBusy] = useState(false);

  // No customer info at all means the lookup itself failed (offline / API
  // hiccup) — a different situation from "you don't have a subscription".
  const unverified = customerInfo === null;

  const handlePlans = async () => {
    setBusy(true);
    const result = await presentPaywall();
    setBusy(false);
    if (result.error) Alert.alert("Couldn't load the plans", 'Check your connection and try again.');
    // On purchase/restore the store flips isPro and the app opens by itself.
  };

  const handleRetry = async () => {
    setBusy(true);
    await refreshCustomerInfo();
    setBusy(false);
  };

  const handleRestore = async () => {
    const result = await restore();
    if (!result.ok) Alert.alert('Restore failed', result.error);
    else if (!useSubscriptionStore.getState().isPro) Alert.alert('Nothing to restore', "We couldn't find an active subscription on this account.");
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={[typography.title, { color: colors.text, marginBottom: 10, textAlign: 'center' }]}>
            {unverified ? "Couldn't check your plan" : 'Start with Hyvo Pro'}
          </Text>
          <Text style={[typography.subtitle, { textAlign: 'center' }]}>
            {unverified ? 'We need a connection to confirm your subscription.' : 'Plans and pricing are shown before you subscribe.'}
          </Text>
        </View>

        {!unverified && (
          <View style={styles.featureList}>
            {FEATURES.map((f) => (
              <View key={f} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <CheckCircleBigIcon size={13} color="#000" />
                </View>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.text} />
          </View>
        ) : (
          <PrimaryButton label={unverified ? 'Try again' : 'See plans'} onPress={unverified ? handleRetry : handlePlans} />
        )}

        <Pressable style={styles.linkRow} onPress={redeemPromoCode} hitSlop={8}>
          <Text style={styles.link}>Have a promo code?</Text>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={handleRestore} hitSlop={8}>
          <Text style={styles.link}>Restore purchase</Text>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => signOut()} hitSlop={8}>
          <Text style={styles.link}>Sign out</Text>
        </Pressable>

        <Text style={styles.fine}>
          Hyvo Pro is an auto-renewing subscription. Payment is charged to your {STORE_ACCOUNT} at confirmation and renews
          automatically unless you turn off auto-renew at least 24 hours before the period ends. Manage or cancel in your account subscription
          settings.
        </Text>
        <Text style={styles.fine}>
          <Text style={styles.finelink} onPress={() => Linking.openURL(`${API_BASE_URL}/terms`)}>
            Terms of Service
          </Text>
          {'  ·  '}
          <Text style={styles.finelink} onPress={() => Linking.openURL(`${API_BASE_URL}/privacy`)}>
            Privacy Policy
          </Text>
          {'  ·  '}
          <Text style={styles.finelink} onPress={() => Linking.openURL(`${API_BASE_URL}/delete-account`)}>
            Delete account
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 16 },
  hero: { alignItems: 'center', paddingTop: 20, paddingBottom: 8 },
  featureList: { gap: 14, marginVertical: 22 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontFamily: fonts.semiBold, fontSize: 14.5, color: colors.text },
  footer: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16 },
  busy: { paddingVertical: 18, alignItems: 'center' },
  linkRow: { alignItems: 'center', marginTop: 14 },
  link: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textDim, textDecorationLine: 'underline' },
  fine: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textDimmer, textAlign: 'center', lineHeight: 17, marginTop: 12 },
  finelink: { color: colors.textDim, textDecorationLine: 'underline' },
});
