import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, typography } from '@/theme/trackerTokens';
import { TrChevLeftIcon, TrTrophyIcon } from '@/icons';
import { useSubscriptionStore, isRevenueCatConfigured } from '@/store/subscriptionStore';

export function UpgradeScreen() {
  const navigation = useNavigation();
  const { isPro, presentPaywall, restore, presentCustomerCenter } = useSubscriptionStore();
  const [presenting, setPresenting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [managing, setManaging] = useState(false);

  const handleUpgrade = async () => {
    setPresenting(true);
    const result = await presentPaywall();
    setPresenting(false);
    if (result.purchased) Alert.alert('You’re Pro!', 'Thanks for subscribing to Hyvo Pro.');
    else if (result.restored) Alert.alert('Restored', 'Your Hyvo Pro subscription has been restored.');
    else if (result.error) Alert.alert('Something went wrong', 'Please try again.');
  };

  const handleRestore = async () => {
    setRestoring(true);
    const result = await restore();
    setRestoring(false);
    Alert.alert(result.ok ? 'Restored' : 'Restore failed', result.ok ? 'Your purchases have been restored.' : result.error);
  };

  const handleManage = async () => {
    setManaging(true);
    await presentCustomerCenter();
    setManaging(false);
  };

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
          <>
            <View style={styles.card}>
              <Text style={styles.cardText}>Your subscription is active.</Text>
            </View>
            <Pressable style={styles.upgradeBtn} onPress={handleManage} disabled={managing}>
              {managing ? <ActivityIndicator color="#000" /> : <Text style={styles.upgradeBtnText}>Manage subscription</Text>}
            </Pressable>
          </>
        )}

        {isRevenueCatConfigured && !isPro && (
          <Pressable style={styles.upgradeBtn} onPress={handleUpgrade} disabled={presenting}>
            {presenting ? <ActivityIndicator color="#000" /> : <Text style={styles.upgradeBtnText}>See plans</Text>}
          </Pressable>
        )}

        {isRevenueCatConfigured && !isPro && (
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
  upgradeBtn: { backgroundColor: colors.text, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  upgradeBtnText: { fontFamily: fonts.bold, fontSize: 15, color: '#000' },
  linkRow: { alignItems: 'center', marginTop: 8 },
  link: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.neutral500, textDecorationLine: 'underline' },
});
