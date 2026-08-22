import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrackerTabBar } from '@/components/tracker/TrackerTabBar';
import { FilterSheet } from '@/components/tracker/FilterSheet';
import { MetricIcon } from '@/components/tracker/iconMap';
import { TrChevDownIcon, TrChevLeftIcon, TrHistoryIcon } from '@/icons';
import { colors, fonts } from '@/theme/trackerTokens';
import { useTrackerStore, ALL_ACTIVITIES, ACTIVITY_ICONS, ActivityType } from '@/store/trackerStore';

const RANGE_LABELS: Record<string, string> = { week: 'Week', month: 'Month', year: 'Year', all: 'All' };
const TYPE_LABELS: Record<string, string> = { all: 'All Activities', cycling: 'Cycling', swimming: 'Swimming', running: 'Running', strength: 'Strength', walking: 'Walking', other: 'Other' };

export function AllActivities() {
  const navigation = useNavigation();
  const { activityFilter, openFilterSheet } = useTrackerStore();

  const filtered = ALL_ACTIVITIES.filter((a) => {
    if (activityFilter.type !== 'all' && a.type !== activityFilter.type) return false;
    if (activityFilter.range === 'week' && a.daysAgo > 7) return false;
    if (activityFilter.range === 'month' && a.daysAgo > 30) return false;
    if (activityFilter.range === 'year' && a.daysAgo > 365) return false;
    return true;
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
          <TrChevLeftIcon size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Activities</Text>
        <View style={{ width: 34 }} />
      </View>
      <View style={styles.filterRow}>
        <Pressable style={styles.trigger} onPress={() => openFilterSheet('range')}>
          <Text style={styles.triggerText}>{RANGE_LABELS[activityFilter.range]}</Text>
          <TrChevDownIcon size={12} color={colors.neutral500} />
        </Pressable>
        <Pressable style={styles.trigger} onPress={() => openFilterSheet('type')}>
          <Text style={styles.triggerText}>{TYPE_LABELS[activityFilter.type]}</Text>
          <TrChevDownIcon size={12} color={colors.neutral500} />
        </Pressable>
      </View>
      {filtered.length ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {filtered.map((a, i) => (
            <View key={i} style={styles.row}>
              <View style={styles.ico}>
                <MetricIcon id={ACTIVITY_ICONS[a.type as ActivityType]} size={17} color={colors.accent200} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{a.title}</Text>
                <Text style={styles.rowMeta}>{a.meta}</Text>
              </View>
              <Text style={styles.rowTime}>{a.time}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <TrHistoryIcon size={28} color={colors.neutral500} />
          <Text style={styles.emptyText}>No activities match this filter.</Text>
        </View>
      )}
      <TrackerTabBar active="HomeTab" />
      <FilterSheet />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18 },
  iconBtnRound: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  filterRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 22, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  triggerText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.text },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 118, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 18, padding: 11, marginBottom: 8 },
  ico: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.neutral200, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, color: colors.text, fontFamily: fonts.regular },
  rowMeta: { fontSize: 11.5, color: colors.neutral500, marginTop: 2, fontFamily: fonts.regular },
  rowTime: { fontSize: 11, color: colors.neutral500, fontFamily: fonts.regular },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  emptyText: { color: colors.neutral500, fontSize: 13, textAlign: 'center', fontFamily: fonts.regular },
});
