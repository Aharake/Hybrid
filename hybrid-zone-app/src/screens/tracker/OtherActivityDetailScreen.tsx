import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme/trackerTokens';
import { useTrackerStore, ACTIVITY_ICONS } from '@/store/trackerStore';
import { fmtDistance } from '@/engine/units';
import { DetailScreenHeader } from '@/components/tracker/DetailScreenHeader';
import { MetricIcon } from '@/components/tracker/iconMap';

export function OtherActivityDetailScreen() {
  const { activities, activeActivityIndex, unitSystem } = useTrackerStore();
  const a = activeActivityIndex !== null ? activities[activeActivityIndex] : null;

  if (!a || !a.otherStats) return <SafeAreaView style={styles.screen} edges={['top']} />;
  const os = a.otherStats;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DetailScreenHeader title={a.title} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.time}>{a.time}</Text>
        <View style={styles.iconWrap}>
          <MetricIcon id={ACTIVITY_ICONS[a.type]} size={30} color={colors.text} />
        </View>
        <View style={styles.statsRow}>
          <Stat label="Duration" val={`${os.duration} min`} />
          {!!os.distance && <Stat label="Distance" val={fmtDistance(os.distance, unitSystem)} />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, val }: { label: string; val: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statKicker}>{label}</Text>
      <Text style={styles.statVal}>{val}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 30, alignItems: 'center' },
  time: { fontSize: 11.5, color: colors.neutral500, fontFamily: fonts.regular },
  iconWrap: { paddingVertical: 20 },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.divider },
  stat: { alignItems: 'center' },
  statKicker: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.accent200, marginBottom: 5, fontFamily: fonts.regular },
  statVal: { fontFamily: fonts.semiBold, fontSize: 19, color: colors.text },
});
