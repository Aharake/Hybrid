import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrackerTabBar } from '@/components/tracker/TrackerTabBar';
import { NewSessionSheet } from '@/components/tracker/NewSessionSheet';
import { RunTrackerOverlay } from '@/components/tracker/RunTrackerOverlay';
import { RunSetupSheet } from '@/components/tracker/RunSetupSheet';
import { TrBellIcon, TrChevRightIcon, TrDevicesIcon, TrShieldIcon, TrSignOutIcon, TrSlidersIcon } from '@/icons';
import { colors, fonts, radius } from '@/theme/trackerTokens';

const SETTINGS = [
  { icon: TrBellIcon, label: 'Push Notifications', value: null },
  { icon: TrSlidersIcon, label: 'Units of Measure', value: 'Metric' },
  { icon: TrDevicesIcon, label: 'Connected Apps & Devices', value: null },
  { icon: TrShieldIcon, label: 'Privacy & Sharing', value: null },
];

export function AccountTab() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <Text style={styles.name}>Marcus Vance</Text>
          <Text style={styles.since}>Elite Member since Jan 2024</Text>
        </View>

        <View style={styles.statsRow}>
          <AcctStat val="148" lbl="Workouts" />
          <AcctStat val="312 km" lbl="Distance" />
          <AcctStat val="12 Days" lbl="Streak" />
        </View>

        <View>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.settingsList}>
            {SETTINGS.map((s, i) => (
              <View key={s.label} style={[styles.settingsRow, i !== SETTINGS.length - 1 && styles.settingsRowBorder]}>
                <s.icon size={17} color={colors.accent200} />
                <Text style={styles.settingsLabel}>{s.label}</Text>
                {!!s.value && <Text style={styles.settingsValue}>{s.value}</Text>}
                <TrChevRightIcon size={14} color={colors.text} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.signOutBtn}>
          <TrSignOutIcon size={15} color={colors.neutral500} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </View>
      </ScrollView>
      <TrackerTabBar active="AccountTab" />
      <NewSessionSheet />
      <RunTrackerOverlay />
      <RunSetupSheet />
    </SafeAreaView>
  );
}

function AcctStat({ val, lbl }: { val: string; lbl: string }) {
  return (
    <View style={styles.acctStat}>
      <Text style={styles.acctStatVal}>{val}</Text>
      <Text style={styles.acctStatLbl}>{lbl}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 118, gap: 22 },
  profile: { alignItems: 'center', gap: 10, paddingTop: 4 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.neutral300, alignItems: 'center', justifyContent: 'center', borderWidth: 3.5, borderColor: colors.text },
  avatarEmoji: { fontSize: 32 },
  name: { fontFamily: fonts.medium, fontSize: 19, color: colors.text },
  since: { fontSize: 12.5, color: colors.neutral500, marginTop: 3, fontFamily: fonts.regular },
  statsRow: { flexDirection: 'row', gap: 8 },
  acctStat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  acctStatVal: { fontSize: 17, color: colors.text, fontFamily: fonts.regular },
  acctStatLbl: { fontSize: 10, color: colors.neutral500, marginTop: 3, fontFamily: fonts.regular },
  sectionTitle: { fontFamily: fonts.medium, fontSize: 16, color: colors.text, marginBottom: 10 },
  settingsList: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  settingsLabel: { flex: 1, fontSize: 13.5, color: colors.text, fontFamily: fonts.regular },
  settingsValue: { fontSize: 12, color: colors.neutral500, fontFamily: fonts.regular },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.divider, borderRadius: radius.md, paddingVertical: 13 },
  signOutText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.neutral500 },
});
