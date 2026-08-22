import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MetricTile } from '@/components/tracker/MetricTile';
import { TrChevLeftIcon } from '@/icons';
import { colors, fonts, typography } from '@/theme/trackerTokens';
import { DAY_FULL_MAP } from '@/engine/calendar';
import { useTrackerStore, OVERVIEW_METRICS, MetricContext, SessionKey } from '@/store/trackerStore';

const SECTION_LABELS: Record<MetricContext, string> = { home: 'Home', strength: 'Strength', running: 'Running' };

export function ViewAllOverview() {
  const navigation = useNavigation();
  const { sessions, viewDay, sets, enabled, toggleMetric } = useTrackerStore();

  const viewDayFull = DAY_FULL_MAP[viewDay];
  const sessionKeys = Object.keys(sessions) as SessionKey[];
  const viewStrengthKey = sessionKeys.find((key) => sessions[key].day === viewDayFull) || null;
  const viewEx = viewStrengthKey ? sessions[viewStrengthKey].exercises : [];
  const doneCount = viewEx.filter((ex) => (sets[ex.id] || []).length > 0).length;
  const doneLive = `${doneCount}/${viewEx.length}`;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
          <TrChevLeftIcon size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Overview</Text>
        <View style={{ width: 34 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Every stat across Home, Strength, and Running — tap any box to show or hide it on that page's overview.
        </Text>
        {(['home', 'strength', 'running'] as MetricContext[]).map((ctx) => {
          const isStrength = ctx === 'strength';
          return (
            <View key={ctx}>
              <Text style={[typography.sectionTitle, styles.sectionSpacing]}>{SECTION_LABELS[ctx]}</Text>
              <View style={isStrength ? styles.strengthRow : styles.metricsGrid}>
                {OVERVIEW_METRICS[ctx].map((m) => (
                  <MetricTile
                    key={m.id}
                    variant={isStrength ? 'strength' : 'card'}
                    icon={m.icon}
                    label={m.label}
                    value={ctx === 'strength' && m.id === 'done' ? doneLive : m.value}
                    unit={m.unit}
                    big={!isStrength && m.big}
                    bars={m.bars}
                    toggled={enabled[ctx][m.id]}
                    onPress={() => toggleMetric(ctx, m.id)}
                    widthPct={isStrength ? 31 : ctx === 'home' ? (m.big ? 48 : 31) : 48}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18 },
  iconBtnRound: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 },
  intro: { fontSize: 12, color: colors.neutral500, marginBottom: 6, fontFamily: fonts.regular },
  sectionSpacing: { marginTop: 18, marginBottom: 10 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  strengthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
