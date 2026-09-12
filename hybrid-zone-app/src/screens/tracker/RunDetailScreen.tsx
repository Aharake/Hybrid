import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/theme/trackerTokens';
import { TrShareIcon } from '@/icons';
import { RunRouteMap } from '@/components/tracker/RunRouteMap';
import { RoutePathSvg } from '@/components/tracker/RoutePathSvg';
import { MetricTile } from '@/components/tracker/MetricTile';
import { useTrackerStore } from '@/store/trackerStore';
import { distanceUnitLabel, distanceValueOnly, fmtDistance, fmtPaceFromSecPerKm } from '@/engine/units';
import { DetailScreenHeader } from '@/components/tracker/DetailScreenHeader';
import type { TrackerStackParamList } from '@/navigation/trackerTypes';

export function RunDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<TrackerStackParamList>>();
  const { activities, activeActivityIndex, unitSystem, openRunShareCard } = useTrackerStore();
  const a = activeActivityIndex !== null ? activities[activeActivityIndex] : null;

  if (!a || !a.runStats) return <SafeAreaView style={styles.screen} edges={['top']} />;
  const rs = a.runStats;
  const avgPaceSecPerKm = (rs.duration * 60) / rs.distance;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DetailScreenHeader
        title={a.title}
        right={
          <Pressable
            style={styles.iconBtnRound}
            onPress={() => {
              openRunShareCard();
              navigation.navigate('RunShareCard');
            }}
          >
            <TrShareIcon size={16} color={colors.text} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.time}>{a.time}</Text>
        <View style={styles.routeWrap}>
          {rs.route && rs.route.length > 1 ? <RunRouteMap route={rs.route} style={styles.map} /> : <RoutePathSvg size={230} color={colors.text} />}
        </View>
        <View style={styles.statsRow}>
          <Stat label="Distance" val={fmtDistance(rs.distance, unitSystem)} />
          <Stat label="Duration" val={`${rs.duration} min`} />
          <Stat label="Avg Pace" val={fmtPaceFromSecPerKm(avgPaceSecPerKm, unitSystem)} />
        </View>
        <View style={styles.metricsGrid}>
          <MetricTile label="Calorie Burn" value={String(rs.calories)} unit="kcal" widthPct={100} />
          <MetricTile label="Avg Speed" value={distanceValueOnly(rs.avgSpeed, unitSystem, 1)} unit={`${distanceUnitLabel(unitSystem)}/h`} widthPct={48} />
          <MetricTile label="Max Speed" value={distanceValueOnly(rs.maxSpeed, unitSystem, 1)} unit={`${distanceUnitLabel(unitSystem)}/h`} widthPct={48} />
          {rs.avgHR !== undefined && <MetricTile label="Avg Heart Rate" value={String(rs.avgHR)} unit="bpm" widthPct={48} />}
          {rs.maxHR !== undefined && <MetricTile label="Max Heart Rate" value={String(rs.maxHR)} unit="bpm" widthPct={48} />}
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
  iconBtnRound: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 30, alignItems: 'center', gap: 16 },
  time: { fontSize: 11.5, color: colors.neutral500, fontFamily: fonts.regular },
  routeWrap: { paddingVertical: 16, width: '100%' },
  map: { width: '100%', height: 220, borderRadius: 16, overflow: 'hidden' },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.divider },
  stat: { alignItems: 'center' },
  statKicker: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.accent200, marginBottom: 5, fontFamily: fonts.regular },
  statVal: { fontFamily: fonts.semiBold, fontSize: 19, color: colors.text },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%', marginTop: 4 },
});
