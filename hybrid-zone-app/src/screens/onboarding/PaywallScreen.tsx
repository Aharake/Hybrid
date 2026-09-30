import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fonts, typography } from '@/theme/tokens';
import { CheckCircleBigIcon } from '@/icons';
import type { OnboardingStackParamList } from '@/navigation/types';
import { useSubscriptionStore, isRevenueCatConfigured } from '@/store/subscriptionStore';
import { API_BASE_URL } from '@/api/client';

const FEATURES = [
  'Personalized strength + running plan',
  'Adaptive weekly scheduling',
  'Progress tracking & analytics',
  'Manage or cancel any time in your App Store settings',
];

// Prices and trial terms are never hardcoded here: they come from the
// subscription products configured in RevenueCat / the App Store, and are
// shown by RevenueCat's own paywall before anything is purchased. Without
// that setup this screen simply continues to account creation.
export function PaywallScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const { restore, presentPaywall } = useSubscriptionStore();
  const [busy, setBusy] = useState(false);

  const handleContinue = async () => {
    if (!isRevenueCatConfigured) {
      navigation.navigate('Auth');
      return;
    }
    setBusy(true);
    const result = await presentPaywall();
    setBusy(false);
    if (result.error) {
      Alert.alert("Couldn't load the plans", 'You can continue for now and subscribe later from Profile → Hyvo Pro.');
    }
    // Purchased, restored, or dismissed — either way, on to creating the account.
    navigation.navigate('Auth');
  };

  const handleRestore = async () => {
    const result = await restore();
    Alert.alert(result.ok ? 'Restored' : 'Restore failed', result.ok ? 'Your purchases have been restored.' : result.error);
  };

  return (
    <OnboardingScreen
      footer={
        <>
          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator color={colors.text} />
            </View>
          ) : (
            <PrimaryButton label={isRevenueCatConfigured ? 'See plans' : 'Continue'} onPress={handleContinue} />
          )}
          {isRevenueCatConfigured && (
            <Pressable style={styles.linkRow} onPress={handleRestore}>
              <Text style={styles.link}>Restore purchase</Text>
            </Pressable>
          )}
        </>
      }
    >
      <View style={styles.hero}>
        <Text style={[typography.title, { color: colors.text, marginBottom: 10, textAlign: 'center' }]}>
          {isRevenueCatConfigured ? 'Get the most from Hyvo' : 'Your plan is ready'}
        </Text>
        <Text style={[typography.subtitle, { textAlign: 'center' }]}>
          {isRevenueCatConfigured ? 'Plans and pricing are shown before you subscribe.' : 'Create your account to save your plan and start training.'}
        </Text>
      </View>

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

      {isRevenueCatConfigured && (
        <Text style={styles.fine}>
          Hyvo Pro is an auto-renewing subscription. Payment is charged to your Apple ID or Google Play account at confirmation and renews
          automatically unless you turn off auto-renew at least 24 hours before the period ends. Manage or cancel in your account
          subscription settings.
        </Text>
      )}
      <Text style={styles.fine}>
        By continuing you agree to the{' '}
        <Text style={styles.finelink} onPress={() => Linking.openURL(`${API_BASE_URL}/terms`)}>
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text style={styles.finelink} onPress={() => Linking.openURL(`${API_BASE_URL}/privacy`)}>
          Privacy Policy
        </Text>
        .
      </Text>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 20, paddingBottom: 8 },
  featureList: { gap: 14, marginVertical: 22 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontFamily: fonts.semiBold, fontSize: 14.5, color: colors.text },
  busy: { paddingVertical: 18, alignItems: 'center' },
  fine: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textDimmer, textAlign: 'center', lineHeight: 17, marginTop: 12 },
  finelink: { color: colors.textDim, textDecorationLine: 'underline' },
  linkRow: { alignItems: 'center', marginTop: 16 },
  link: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textDim, textDecorationLine: 'underline' },
});
