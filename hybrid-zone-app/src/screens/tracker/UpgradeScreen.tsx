import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, typography } from '@/theme/trackerTokens';
import { TrChevLeftIcon, TrTrophyIcon } from '@/icons';
import { useSubscriptionStore, isRevenueCatConfigured } from '@/store/subscriptionStore';
import type { PurchasesPackage } from 'react-native-purchases';

export function UpgradeScreen() {
  const navigation = useNavigation();
  const { isPro, currentOffering, loading, error, loadOfferings, purchase, restore } = useSubscriptionStore();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (isRevenueCatConfigured) loadOfferings();
  }, [loadOfferings]);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setPurchasingId(pkg.identifier);
    const result = await purchase(pkg);
    setPurchasingId(null);
    if (result.ok) {
      Alert.alert('You’re Pro!', 'Thanks for subscribing to Hyvo Pro.');
    } else if (!result.cancelled) {
      Alert.alert('Purchase failed', result.error ?? 'Please try again.');
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    const result = await restore();
    setRestoring(false);
    Alert.alert(result.ok ? 'Restored' : 'Restore failed', result.ok ? 'Your purchases have been restored.' : result.error);
  };

  const packages = currentOffering?.availablePackages ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
          <TrChevLeftIcon size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Hyvo Pro</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <TrTrophyIcon size={26} color={colors.strength} />
          </View>
          <Text style={[typography.hTitle, { textAlign: 'center', marginTop: 12 }]}>
            {isPro ? "You're on Hyvo Pro" : 'Upgrade to Hyvo Pro'}
          </Text>
        </View>

        {!isRevenueCatConfigured && (
          <View style={styles.card}>
            <Text style={styles.cardText}>Subscriptions aren't set up yet. Check back soon.</Text>
          </View>
        )}

        {isRevenueCatConfigured && isPro && (
          <View style={styles.card}>
            <Text style={styles.cardText}>Your subscription is active. Manage or cancel it from your device's App Store / Play Store subscription settings.</Text>
          </View>
        )}

        {isRevenueCatConfigured && !isPro && loading && (
          <View style={styles.card}>
            <ActivityIndicator color={colors.text} />
          </View>
        )}

        {isRevenueCatConfigured && !isPro && !loading && error && (
          <View style={styles.card}>
            <Text style={styles.cardText}>{error}</Text>
          </View>
        )}

        {isRevenueCatConfigured && !isPro && !loading && !error && packages.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.cardText}>No plans are available right now.</Text>
          </View>
        )}

        {isRevenueCatConfigured && !isPro && packages.length > 0 && (
          <View style={{ gap: 10 }}>
            {packages.map((pkg) => (
              <Pressable
                key={pkg.identifier}
                style={styles.planOption}
                disabled={purchasingId !== null}
                onPress={() => handlePurchase(pkg)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.planLabel}>{pkg.product.title || pkg.identifier}</Text>
                  <Text style={styles.planDesc}>{pkg.product.priceString}</Text>
                </View>
                {purchasingId === pkg.identifier && <ActivityIndicator color={colors.text} />}
              </Pressable>
            ))}
          </View>
        )}

        {isRevenueCatConfigured && (
          <Pressable style={styles.linkRow} onPress={handleRestore} disabled={restoring}>
            <Text style={styles.link}>{restoring ? 'Restoring…' : 'Restore purchases'}</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18 },
  iconBtnRound: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
  hero: { alignItems: 'center', paddingVertical: 12 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 18, alignItems: 'center' },
  cardText: { fontSize: 13.5, color: colors.neutral500, textAlign: 'center', lineHeight: 19, fontFamily: fonts.regular },
  planOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 18, paddingHorizontal: 20 },
  planLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  planDesc: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral500, marginTop: 3 },
  linkRow: { alignItems: 'center', marginTop: 8 },
  link: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.neutral500, textDecorationLine: 'underline' },
});
