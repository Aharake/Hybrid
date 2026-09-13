import React, { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrackerTabBar } from '@/components/tracker/TrackerTabBar';
import { NewSessionSheet } from '@/components/tracker/NewSessionSheet';
import { RunTrackerOverlay } from '@/components/tracker/RunTrackerOverlay';
import { RunSetupSheet } from '@/components/tracker/RunSetupSheet';
import { UnitPickerSheet } from '@/components/tracker/UnitPickerSheet';
import { RunDefaultsPickerSheet } from '@/components/tracker/RunDefaultsPickerSheet';
import { RestTimerPickerSheet } from '@/components/tracker/RestTimerPickerSheet';
import { AchievementBadge } from '@/components/tracker/AchievementBadge';
import { MiniRing } from '@/components/tracker/MiniRing';
import {
  TrBellIcon,
  TrChevRightIcon,
  TrDevicesIcon,
  TrDownloadIcon,
  TrFlameIcon,
  TrHelpIcon,
  TrInfoIcon,
  TrPencilIcon,
  TrRunSmallIcon,
  TrShieldIcon,
  TrSignOutIcon,
  TrSlidersIcon,
  TrStrengthIcon,
  TrTrophyIcon,
} from '@/icons';
import { colors, fonts, radius, typography } from '@/theme/trackerTokens';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { useTrackerStore, PERSONAL_RECORDS, ACTIVITY_MILESTONES, FIRSTS } from '@/store/trackerStore';
import { distanceUnitLabel, distanceValueOnly } from '@/engine/units';
import { getRingThresholdStyle } from '@/engine/ringStyle';
import type { TrackerStackParamList } from '@/navigation/trackerTypes';

const SUMMARY_RANGES: ['1m' | '3m' | 'all', string][] = [
  ['1m', '1M'],
  ['3m', '3M'],
  ['all', 'All Time'],
];

export function AccountTab() {
  const navigation = useNavigation<NativeStackNavigationProp<TrackerStackParamList>>();
  const signOut = useAuthStore((s) => s.signOut);
  const user = useAuthStore((s) => s.user);
  const isPro = useSubscriptionStore((s) => s.isPro);
  const {
    unitSystem,
    openUnitPicker,
    openRunDefaultsPicker,
    restTimer,
    openRestTimerPicker,
    activitySummaryRange,
    selectActivitySummaryRange,
    getActivitySummaryValues,
    dataHighlightsRange,
    selectDataHighlightsRange,
    getDataHighlightsValues,
    buildLoggedSetsCsv,
  } = useTrackerStore();

  const [pushGranted, setPushGranted] = useState<boolean | null>(null);
  useEffect(() => {
    Notifications.getPermissionsAsync().then((s) => setPushGranted(s.granted));
  }, []);

  const handlePushNotifications = async () => {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      Alert.alert('Notifications are on', 'Manage or turn them off from your device Settings.', [
        { text: 'OK', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    if (!current.canAskAgain) {
      Linking.openSettings();
      return;
    }
    const result = await Notifications.requestPermissionsAsync();
    setPushGranted(result.granted);
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleExport = async () => {
    const csv = buildLoggedSetsCsv();
    if (csv.split('\n').length <= 1) {
      Alert.alert('Nothing to export yet', 'Log a few sets first.');
      return;
    }
    try {
      await Share.share({ message: csv, title: 'hyvo-logged-sets.csv' });
    } catch {
      // user cancelled the share sheet — nothing to do
    }
  };

  const summaryVals = getActivitySummaryValues();
  const summaryTotal = summaryVals.workouts + summaryVals.runs;
  const workoutsPct = summaryTotal ? Math.round((summaryVals.workouts / summaryTotal) * 100) : 0;
  const runsPct = summaryTotal ? 100 - workoutsPct : 0;

  const highlightVals = getDataHighlightsValues();
  const consistencyStyle = getRingThresholdStyle(highlightVals.consistency);
  const loadStyle = getRingThresholdStyle(highlightVals.load);

  const featuredMilestone = [...ACTIVITY_MILESTONES].reverse().find((m) => m.earned);
  const featuredFirst = FIRSTS.filter((f) => f.earned).slice(-1)[0];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.profileKicker}>Profile</Text>

        <View style={styles.profileCard}>
          <Image source={require('../../../assets/logo-mark.png')} style={styles.logo} resizeMode="contain" />
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <View style={styles.profileHeadRow}>
            <View>
              <Text style={styles.name}>{user?.name || 'Member'}</Text>
              <Text style={styles.since}>{user?.email ?? ''}</Text>
            </View>
            <Pressable style={styles.editBtn}>
              <TrPencilIcon size={13} color={colors.text} />
              <Text style={styles.editBtnText}>EDIT</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <AcctStat val="148" lbl="Activities Logged" />
          <AcctStat val={distanceValueOnly(312, unitSystem, 0)} unit={distanceUnitLabel(unitSystem)} lbl="Total Run Distance" />
        </View>

        <View style={styles.streakRow}>
          <Text style={styles.streakLabel}>Day Streak</Text>
          <View style={styles.streakValRow}>
            <TrFlameIcon size={15} color={colors.strength} />
            <Text style={styles.streakVal}>12 Days</Text>
          </View>
        </View>

        <View>
          <View style={styles.rowBetween}>
            <Text style={typography.sectionTitle}>Achievements</Text>
            <Text style={styles.link} onPress={() => navigation.navigate('AchievementsHub')}>
              View All
            </Text>
          </View>
          <Pressable style={styles.badgeRow} onPress={() => navigation.navigate('AchievementsHub')}>
            {PERSONAL_RECORDS.find((p) => p.id === 'pr5k') && <AchievementBadge item={PERSONAL_RECORDS.find((p) => p.id === 'pr5k')!} shape="hex" size={72} />}
            {featuredMilestone && <AchievementBadge item={featuredMilestone} shape="hex" size={72} />}
            {featuredFirst && <AchievementBadge item={featuredFirst} shape="disc" size={72} />}
          </Pressable>
        </View>

        <View>
          <Text style={[typography.sectionTitle, { marginBottom: 10 }]}>Activity Summary</Text>
          <View style={styles.panel}>
            <View style={styles.tabs}>
              {SUMMARY_RANGES.map(([id, label]) => (
                <Pressable key={id} style={[styles.tab, activitySummaryRange === id && styles.tabActive]} onPress={() => selectActivitySummaryRange(id)}>
                  <Text style={[styles.tabText, activitySummaryRange === id && styles.tabTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.summaryTotal}>
              {summaryTotal}
              <Text style={styles.summaryTotalUnit}> total</Text>
            </Text>
            <BarRow icon={<TrStrengthIcon size={13} color={colors.strength} />} label="Workouts Logged" val={summaryVals.workouts} pct={workoutsPct} color={colors.strength} />
            <BarRow icon={<TrRunSmallIcon size={13} color={colors.running} />} label="Runs Logged" val={summaryVals.runs} pct={runsPct} color={colors.running} />
          </View>
        </View>

        <View>
          <Text style={[typography.sectionTitle, { marginBottom: 10 }]}>Data Highlights</Text>
          <View style={styles.panel}>
            <View style={styles.tabs}>
              {SUMMARY_RANGES.map(([id, label]) => (
                <Pressable key={id} style={[styles.tab, dataHighlightsRange === id && styles.tabActive]} onPress={() => selectDataHighlightsRange(id)}>
                  <Text style={[styles.tabText, dataHighlightsRange === id && styles.tabTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.ringsRow}>
              <View style={styles.ringCol}>
                <MiniRing pct={highlightVals.consistency} color={consistencyStyle.color} dim={colors.surface} size={68} />
                <Text style={styles.ringLbl}>Best{'\n'}Consistency</Text>
              </View>
              <View style={styles.ringCol}>
                <MiniRing pct={highlightVals.load} color={loadStyle.color} dim={colors.surface} size={68} />
                <Text style={styles.ringLbl}>Peak{'\n'}Training Load</Text>
              </View>
            </View>
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.settingsList}>
            <SettingsRow icon={TrTrophyIcon} label="Hyvo Pro" value={isPro ? 'Active' : undefined} onPress={() => navigation.navigate('Upgrade')} />
            <SettingsRow
              icon={TrBellIcon}
              label="Push Notifications"
              value={pushGranted === null ? undefined : pushGranted ? 'On' : 'Off'}
              onPress={handlePushNotifications}
            />
            <SettingsRow icon={TrSlidersIcon} label="Units of Measure" value={unitSystem === 'imperial' ? 'Imperial' : 'Metric'} onPress={openUnitPicker} />
            <SettingsRow icon={TrRunSmallIcon} label="Run Defaults" onPress={openRunDefaultsPicker} />
            <SettingsRow icon={TrSlidersIcon} label="Rest Timer Default" value={`${restTimer.duration}s`} onPress={openRestTimerPicker} />
            <SettingsRow icon={TrDevicesIcon} label="Connected Apps & Devices" onPress={() => navigation.navigate('ConnectedApps')} />
            <SettingsRow icon={TrShieldIcon} label="Privacy & Sharing" onPress={() => navigation.navigate('PrivacySettings')} />
            <SettingsRow icon={TrDownloadIcon} label="Data Export" onPress={handleExport} chevron={false} />
            <SettingsRow icon={TrHelpIcon} label="Help & Support" onPress={() => navigation.navigate('HelpSupport')} />
            <SettingsRow icon={TrInfoIcon} label="About" onPress={() => navigation.navigate('About')} last />
          </View>
        </View>

        <Pressable style={styles.signOutBtn} onPress={confirmSignOut}>
          <TrSignOutIcon size={15} color={colors.neutral500} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
      <TrackerTabBar active="AccountTab" />
      <NewSessionSheet />
      <RunTrackerOverlay />
      <RunSetupSheet />
      <UnitPickerSheet />
      <RunDefaultsPickerSheet />
      <RestTimerPickerSheet />
    </SafeAreaView>
  );
}

function AcctStat({ val, unit, lbl }: { val: string; unit?: string; lbl: string }) {
  return (
    <View style={styles.acctStat}>
      <Text style={styles.acctStatVal}>
        {val}
        {!!unit && <Text style={styles.acctStatUnit}> {unit}</Text>}
      </Text>
      <Text style={styles.acctStatLbl}>{lbl}</Text>
    </View>
  );
}

function BarRow({ icon, label, val, pct, color }: { icon: React.ReactNode; label: string; val: number; pct: number; color: string }) {
  return (
    <View style={styles.barBlock}>
      <View style={styles.barTopRow}>
        <View style={styles.barLabelRow}>
          {icon}
          <Text style={styles.barLabel}>{label}</Text>
        </View>
        <Text style={styles.barVal}>{val}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  onPress,
  chevron = true,
  last,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable style={[styles.settingsRow, !last && styles.settingsRowBorder]} onPress={onPress} disabled={!onPress}>
      <Icon size={17} color={colors.accent200} />
      <Text style={styles.settingsLabel}>{label}</Text>
      {!!value && <Text style={styles.settingsValue}>{value}</Text>}
      {chevron && <TrChevRightIcon size={14} color={colors.text} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 118, gap: 22 },
  profileKicker: { textAlign: 'center', fontSize: 12.5, fontFamily: fonts.semiBold, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.neutral500, marginBottom: -6 },
  profileCard: { gap: 14, paddingVertical: 28, paddingHorizontal: 18, borderRadius: radius.lg, backgroundColor: colors.surface },
  logo: { width: 22, height: 22, alignSelf: 'center', marginBottom: -2 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.neutral300, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', borderWidth: 3.5, borderColor: colors.bg },
  avatarEmoji: { fontSize: 32 },
  profileHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontFamily: fonts.medium, fontSize: 19, color: colors.text },
  since: { fontSize: 12.5, color: colors.neutral500, marginTop: 3, fontFamily: fonts.regular },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  editBtnText: { fontSize: 11.5, fontFamily: fonts.semiBold, letterSpacing: 0.4, color: colors.text },
  statsRow: { flexDirection: 'row', gap: 8 },
  acctStat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center' },
  acctStatVal: { fontSize: 22, color: colors.text, fontFamily: fonts.semiBold },
  acctStatUnit: { fontSize: 13, fontFamily: fonts.medium },
  acctStatLbl: { fontSize: 11, color: colors.neutral500, marginTop: 4, fontFamily: fonts.regular },
  streakRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: 15 },
  streakLabel: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.text },
  streakValRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakVal: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  link: { fontSize: 12, color: colors.accent200, fontFamily: fonts.regular },
  badgeRow: { flexDirection: 'row', gap: 14, justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 18, paddingHorizontal: 10 },
  panel: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16 },
  tabs: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 999, padding: 3, gap: 2 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 999 },
  tabActive: { backgroundColor: colors.surface },
  tabText: { fontSize: 11.5, fontFamily: fonts.semiBold, color: colors.neutral500 },
  tabTextActive: { color: colors.text },
  summaryTotal: { fontFamily: fonts.bold, fontSize: 28, color: colors.text, marginTop: 16 },
  summaryTotalUnit: { fontSize: 15, fontFamily: fonts.medium },
  barBlock: { marginTop: 14 },
  barTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 12.5, color: colors.text, fontFamily: fonts.medium },
  barVal: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.text },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.bg, overflow: 'hidden', marginTop: 8 },
  barFill: { height: '100%', borderRadius: 3 },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 18 },
  ringCol: { alignItems: 'center', gap: 8 },
  ringLbl: { fontSize: 10.5, fontFamily: fonts.semiBold, color: colors.neutral500, textAlign: 'center' },
  sectionTitle: { fontFamily: fonts.medium, fontSize: 16, color: colors.text, marginBottom: 10 },
  settingsList: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  settingsLabel: { flex: 1, fontSize: 13.5, color: colors.text, fontFamily: fonts.regular },
  settingsValue: { fontSize: 12, color: colors.neutral500, fontFamily: fonts.regular },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.divider, borderRadius: radius.md, paddingVertical: 13 },
  signOutText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.neutral500 },
});
