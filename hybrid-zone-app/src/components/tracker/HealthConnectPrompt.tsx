import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/theme/trackerTokens';
import { TrBurnIcon, TrHeartrateIcon, TrSleepIcon, TrStepsIcon } from '@/icons';
import { healthSourceName } from '@/engine/health';
import { useHealthStore } from '@/store/healthStore';
import { Sheet } from './Sheet';

const POINTS = [
  { Icon: TrStepsIcon, text: 'Steps and calories on your Home tab' },
  { Icon: TrHeartrateIcon, text: 'Heart rate on every run and workout summary' },
  { Icon: TrSleepIcon, text: 'Last night’s sleep next to your training' },
];

// Shown once, the first time the tracker opens after sign-up (or after an
// update, for anyone who hasn't connected yet). It explains what the data is
// for *before* the system permission sheet appears, which is what Apple's
// review guidelines expect. Answering either way means it never comes back;
// connecting later is always possible from Profile → Connected Apps.
export function HealthConnectPrompt() {
  const { supported, connected, prompted, promptReady, syncing, error, connect, markPrompted } = useHealthStore();
  const [show, setShow] = useState(false);

  // Let the Home screen appear first so the sheet doesn't fight the transition.
  useEffect(() => {
    if (!supported || !promptReady || prompted || connected) return;
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, [supported, promptReady, prompted, connected]);

  if (!show || prompted || connected) return null;

  const handleConnect = async () => {
    const ok = await connect();
    if (ok) setShow(false);
  };
  const handleLater = () => {
    markPrompted();
    setShow(false);
  };

  return (
    <Sheet visible onClose={handleLater} title={`Connect ${healthSourceName}`} zIndex={70}>
      <Text style={styles.lead}>Hyvo can read your activity from {healthSourceName} and keep it up to date on its own, so you never log it twice.</Text>
      <View style={styles.list}>
        {POINTS.map(({ Icon, text }) => (
          <View key={text} style={styles.row}>
            <View style={styles.ico}>
              <Icon size={15} color={colors.text} />
            </View>
            <Text style={styles.rowText}>{text}</Text>
          </View>
        ))}
        <View style={styles.row}>
          <View style={styles.ico}>
            <TrBurnIcon size={15} color={colors.text} />
          </View>
          <Text style={styles.rowText}>Refreshes automatically while you use the app</Text>
        </View>
      </View>
      <Text style={styles.fine}>Hyvo only reads this data to show it to you. It isn’t sold or used for advertising. You choose exactly what to share on the next screen.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} onPress={handleConnect} disabled={syncing}>
        {syncing ? <ActivityIndicator size="small" color={colors.bg} /> : <Text style={styles.primaryText}>Connect {healthSourceName}</Text>}
      </Pressable>
      <Pressable style={styles.later} onPress={handleLater}>
        <Text style={styles.laterText}>Not now</Text>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.neutral700 },
  list: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ico: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  fine: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, color: colors.neutral500 },
  error: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.red },
  primary: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text, borderRadius: 999, paddingVertical: 15 },
  primaryText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.bg },
  later: { alignItems: 'center', paddingVertical: 8 },
  laterText: { fontFamily: fonts.medium, fontSize: 14, color: colors.neutral500 },
});
