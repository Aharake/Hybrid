import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, typography } from '@/theme/trackerTokens';
import { TrChevLeftIcon, TrChevRightIcon } from '@/icons';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { API_BASE_URL } from '@/api/client';

export function PrivacySettingsScreen() {
  const navigation = useNavigation();
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const isPro = useSubscriptionStore((s) => s.isPro);
  const [deleting, setDeleting] = useState(false);

  const runDelete = async () => {
    setDeleting(true);
    const result = await deleteAccount();
    setDeleting(false);
    if (!result.ok) {
      Alert.alert("Couldn't delete account", result.error ?? 'Please try again.');
    }
    // On success the app navigates away on its own (signed-out phase change).
  };

  const confirmDelete = () => {
    const subscriptionNote = isPro
      ? '\n\nYou have an active Hyvo Pro subscription — deleting your account does not cancel it. Cancel it from your device\'s App Store / Play Store subscription settings to stop billing.'
      : '';
    Alert.alert(
      'Delete your account?',
      `This permanently deletes your program, workout history, run history, and account data. This can't be undone.${subscriptionNote}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: runDelete },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
          <TrChevLeftIcon size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Privacy & Sharing</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.blurb}>
          Hyvo stores your account, program, workout history, and run history (including GPS routes for tracked runs) so it's
          available across devices. It's never sold or used for advertising.
        </Text>

        <View style={styles.settingsList}>
          <Pressable style={styles.row} onPress={() => Linking.openURL(`${API_BASE_URL}/privacy`)}>
            <Text style={styles.rowLabel}>Read the full Privacy Policy</Text>
            <TrChevRightIcon size={14} color={colors.text} />
          </Pressable>
        </View>

        <View>
          <Text style={[typography.sectionTitle, { marginBottom: 10 }]}>Danger Zone</Text>
          <Pressable style={styles.deleteBtn} onPress={confirmDelete} disabled={deleting}>
            {deleting ? <ActivityIndicator color={colors.red} /> : <Text style={styles.deleteBtnText}>Delete My Account</Text>}
          </Pressable>
          <Text style={styles.deleteHint}>Permanently deletes your account and all data. This can't be undone.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18 },
  iconBtnRound: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 26 },
  blurb: { fontSize: 13, color: colors.neutral500, lineHeight: 19, fontFamily: fonts.regular },
  settingsList: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  rowLabel: { fontSize: 13.5, color: colors.text, fontFamily: fonts.regular },
  deleteBtn: { borderWidth: 1, borderColor: colors.red, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  deleteBtnText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.red },
  deleteHint: { fontSize: 11.5, color: colors.neutral500, marginTop: 8, textAlign: 'center', fontFamily: fonts.regular },
});
