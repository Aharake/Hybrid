import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useRootStore } from '@/store/rootStore';
import { colors, fonts, radius, typography } from '@/theme/tokens';
import { CheckCircleBigIcon } from '@/icons';

const FEATURES = [
  'Personalized strength + running plan',
  'Adaptive weekly scheduling',
  'Progress tracking & analytics',
  'Cancel anytime, no questions asked',
];

export function PaywallScreen() {
  const { planTier, setField } = useOnboardingStore();
  const completeOnboarding = useRootStore((s) => s.completeOnboarding);

  return (
    <OnboardingScreen
      footer={
        <>
          <PrimaryButton label="Start free trial" onPress={completeOnboarding} />
          <Pressable style={styles.linkRow} onPress={() => Alert.alert('This is a design prototype.')}>
            <Text style={styles.link}>Restore purchase</Text>
          </Pressable>
        </>
      }
    >
      <View style={styles.hero}>
        <Text style={[typography.title, { color: colors.text, marginBottom: 10, textAlign: 'center' }]}>
          Start your free trial
        </Text>
        <Text style={[typography.subtitle, { textAlign: 'center' }]}>3 days free, then renews automatically. Cancel anytime.</Text>
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

      <Pressable
        onPress={() => setField('planTier', 'annual')}
        style={[styles.planOption, planTier === 'annual' && styles.planOptionSelected]}
      >
        <View>
          <Text style={[styles.planLabel, planTier === 'annual' && styles.planLabelSelected]}>Annual</Text>
          <Text style={[styles.planDesc, planTier === 'annual' && styles.planDescSelected]}>$59.99/yr — $5/mo</Text>
        </View>
        <View style={styles.saveBadge}>
          <Text style={styles.saveBadgeText}>SAVE 50%</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => setField('planTier', 'monthly')}
        style={[styles.planOption, planTier === 'monthly' && styles.planOptionSelected]}
      >
        <View>
          <Text style={[styles.planLabel, planTier === 'monthly' && styles.planLabelSelected]}>Monthly</Text>
          <Text style={[styles.planDesc, planTier === 'monthly' && styles.planDescSelected]}>$9.99/mo</Text>
        </View>
      </Pressable>

      <Text style={styles.fine}>
        3-day free trial, then billed at the selected plan price. Cancel anytime before the trial ends in Settings.
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
  planOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  planOptionSelected: { backgroundColor: colors.text },
  planLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  planLabelSelected: { color: '#000' },
  planDesc: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.textDim, marginTop: 3 },
  planDescSelected: { color: '#48484a' },
  saveBadge: { backgroundColor: colors.green, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  saveBadgeText: { fontFamily: fonts.extraBold, fontSize: 10, color: colors.greenText },
  fine: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textDimmer, textAlign: 'center', lineHeight: 17, marginTop: 12 },
  linkRow: { alignItems: 'center', marginTop: 16 },
  link: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textDim, textDecorationLine: 'underline' },
});
