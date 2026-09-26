import React from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, typography } from '@/theme/trackerTokens';
import { TrBurnIcon, TrChevLeftIcon, TrDevicesIcon, TrHeartrateIcon, TrSleepIcon, TrStepsIcon } from '@/icons';
import { healthSourceName } from '@/engine/health';
import { useHealthStore } from '@/store/healthStore';

function fmtSleep(min: number | null): string {
  return min === null ? '—' : `${Math.floor(min / 60)}h ${min % 60}m`;
}

function fmtSynced(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// Real health-data connection: Apple Health on iOS, Health Connect on Android
// (which is where Google's health/fitness data, plus Fitbit, Garmin, Oura and
// other wearables, are collected). Read-only — Hyvo never writes to it.
export function ConnectedAppsScreen() {
  const navigation = useNavigation();
  const { supported, connected, syncing, error, snapshot, connect, disconnect, refresh } = useHealthStore();

  const confirmDisconnect = () => {
    const where =
      Platform.OS === 'ios'
        ? 'To remove Hyvo’s access completely: Settings → Health → Data Access & Devices → Hyvo.'
        : 'To remove Hyvo’s access completely: Health Connect → App permissions → Hyvo.';
    Alert.alert(`Disconnect ${healthSourceName}?`, `Hyvo will stop showing your health data. ${where}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: disconnect },
      ...(Platform.OS === 'ios' ? [{ text: 'Open Settings', onPress: () => Linking.openSettings() }] : []),
    ]);
  };

  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <TrStepsIcon size={14} color={colors.accent200} />, label: 'Steps today', value: snapshot?.steps != null ? snapshot.steps.toLocaleString('en-US') : '—' },
    { icon: <TrBurnIcon size={14} color={colors.accent200} />, label: 'Active energy', value: snapshot?.activeCalories != null ? `${snapshot.activeCalories} kcal` : '—' },
    { icon: <TrSleepIcon size={14} color={colors.accent200} />, label: 'Sleep last night', value: fmtSleep(snapshot?.sleepMinutes ?? null) },
    { icon: <TrHeartrateIcon size={14} color={colors.accent200} />, label: 'Resting heart rate (7 days)', value: snapshot?.restingHeartRate != null ? `${snapshot.restingHeartRate} bpm` : '—' },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
          <TrChevLeftIcon size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Connected Apps & Devices</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!supported ? (
          <View style={styles.empty}>
            <TrDevicesIcon size={26} color={colors.neutral500} />
            <Text style={[typography.sectionTitle, { marginTop: 12, textAlign: 'center' }]}>Not available here</Text>
            <Text style={styles.emptyText}>Health syncing works in the iPhone and Android apps.</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.sourceIcon}>
                  <TrHeartrateIcon size={20} color={colors.text} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sourceName}>{healthSourceName}</Text>
                  <Text style={styles.sourceStatus}>
                    {connected ? (snapshot ? `Connected · synced ${fmtSynced(snapshot.updatedAt)}` : 'Connected') : 'Not connected'}
                  </Text>
                </View>
                {connected && <View style={styles.liveDot} />}
              </View>

              {connected ? (
                <>
                  <View style={styles.dataList}>
                    {rows.map((r, i) => (
                      <View key={r.label} style={[styles.dataRow, i < rows.length - 1 && styles.dataRowBorder]}>
                        {r.icon}
                        <Text style={styles.dataLabel}>{r.label}</Text>
                        <Text style={styles.dataValue}>{r.value}</Text>
                      </View>
                    ))}
                  </View>
                  {snapshot && rows.every((r) => r.value === '—') && (
                    <Text style={styles.hint}>
                      No readings yet. If you expected some, check that Hyvo is allowed to read them
                      {Platform.OS === 'ios' ? ' in Settings → Health → Data Access & Devices → Hyvo' : ' in Health Connect → App permissions → Hyvo'}.
                    </Text>
                  )}
                  <View style={styles.btnRow}>
                    <Pressable style={[styles.btn, styles.btnFilled]} onPress={() => refresh(true)} disabled={syncing}>
                      {syncing ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.btnFilledText}>Sync now</Text>}
                    </Pressable>
                    <Pressable style={[styles.btn, styles.btnOutline]} onPress={confirmDisconnect}>
                      <Text style={styles.btnOutlineText}>Disconnect</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.cardBody}>
                    Bring in your steps, active energy, sleep and heart rate so your Home and Running overview show real
                    numbers instead of estimates.
                  </Text>
                  <Pressable style={[styles.btn, styles.btnFilled, { marginTop: 14 }]} onPress={connect} disabled={syncing}>
                    {syncing ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.btnFilledText}>Connect {healthSourceName}</Text>}
                  </Pressable>
                </>
              )}

              {!!error && <Text style={styles.error}>{error}</Text>}
            </View>

            <Text style={styles.footnote}>
              Apple Watch, Garmin, Fitbit, Oura and most other wearables sync into {healthSourceName} — connect it here and
              their data shows up in Hyvo too. Hyvo only reads; it never writes to or changes your health data.
            </Text>
          </>
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
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 60, paddingHorizontal: 10 },
  emptyText: { fontSize: 13, color: colors.neutral500, textAlign: 'center', lineHeight: 19, fontFamily: fonts.regular, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sourceIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  sourceName: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  sourceStatus: { fontSize: 12, color: colors.neutral500, marginTop: 2, fontFamily: fonts.regular },
  liveDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#34c759' },
  cardBody: { fontSize: 13, color: colors.neutral500, lineHeight: 19, marginTop: 14, fontFamily: fonts.regular },
  dataList: { marginTop: 14, backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 14 },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  dataRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  dataLabel: { flex: 1, fontSize: 13, color: colors.text, fontFamily: fonts.regular },
  dataValue: { fontSize: 13.5, color: colors.text, fontFamily: fonts.semiBold },
  hint: { fontSize: 11.5, color: colors.neutral500, lineHeight: 17, marginTop: 10, fontFamily: fonts.regular },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingVertical: 13 },
  btnFilled: { backgroundColor: colors.text },
  btnFilledText: { fontFamily: fonts.semiBold, fontSize: 13.5, color: colors.bg },
  btnOutline: { borderWidth: 1, borderColor: colors.divider },
  btnOutlineText: { fontFamily: fonts.semiBold, fontSize: 13.5, color: colors.text },
  error: { fontSize: 12, color: '#ff453a', marginTop: 12, lineHeight: 17, fontFamily: fonts.regular },
  footnote: { fontSize: 11.5, color: colors.neutral500, lineHeight: 17, textAlign: 'center', paddingHorizontal: 6, fontFamily: fonts.regular },
});
