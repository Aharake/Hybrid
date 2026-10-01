import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MetricTile } from '@/components/tracker/MetricTile';
import { ArrangeMetricList } from '@/components/tracker/ArrangeMetricList';
import { TrChevLeftIcon } from '@/icons';
import { colors, fonts, typography } from '@/theme/trackerTokens';
import { DAY_FULL_MAP } from '@/engine/calendar';
import { useTrackerStore, sortedMetrics, MetricContext, SessionKey } from '@/store/trackerStore';
import { useMetrics } from '@/hooks/useStats';

const SECTION_LABELS: Record<MetricContext, string> = { home: 'Home', strength: 'Strength', running: 'Running' };

export function ViewAllOverview() {
  const navigation = useNavigation();
  const { sessions, viewDay, sets, enabled, order, toggleMetric, setMetricOrder, unitSystem } = useTrackerStore();
  const metrics = useMetrics();
  const [arranging, setArranging] = useState(false);

  const viewDayFull = DAY_FULL_MAP[viewDay];
  const sessionKeys = Object.keys(sessions) as SessionKey[];
  const viewStrengthKey = sessionKeys.find((key) => sessions[key].day === viewDayFull) || null;
  const viewEx = viewStrengthKey ? sessions[viewStrengthKey].exercises : [];
  const doneCount = viewEx.filter((ex) => (sets[ex.id] || []).some((r) => r.done)).length;
  const doneLive = `${doneCount}/${viewEx.length}`;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
          <TrChevLeftIcon size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Overview</Text>
        <Pressable onPress={() => setArranging((v) => !v)} hitSlop={8} style={styles.arrangeBtn}>
          <Text style={styles.arrangeText}>{arranging ? 'Done' : 'Arrange'}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          {arranging
            ? 'Drag a row by its handle to move it. That’s the order it appears in on its page.'
            : "Every stat across Home, Strength, and Running — tap any box to show or hide it on that page's overview."}
        </Text>
        {(['home', 'strength', 'running'] as MetricContext[]).map((ctx) => {
          const isStrength = ctx === 'strength';
          const visible = sortedMetrics(ctx, order[ctx]).filter((m) => enabled[ctx][m.id]);
          return (
            <View key={ctx}>
              <Text style={[typography.sectionTitle, styles.sectionSpacing]}>{SECTION_LABELS[ctx]}</Text>

              {arranging ? (
                visible.length ? (
                  <ArrangeMetricList
                    items={visible.map((m) => {
                      const r = metrics[ctx][m.id];
                      const value = ctx === 'strength' && m.id === 'done' ? doneLive : `${r.value || '—'}${r.unit && ctx !== 'strength' ? ` ${r.unit}` : ''}`;
                      return { id: m.id, icon: m.icon, label: r.label ?? m.label, value };
                    })}
                    onReorder={(visibleIds) => {
                      // Reordered tiles go first; anything hidden keeps its old
                      // relative order, tacked on after — it has no position on
                      // the page to drag into until it's switched back on.
                      const hiddenIds = order[ctx].filter((id) => !enabled[ctx][id]);
                      setMetricOrder(ctx, [...visibleIds, ...hiddenIds]);
                    }}
                  />
                ) : (
                  <Text style={styles.empty}>No tiles shown here. Tap Done and switch some on.</Text>
                )
              ) : (
                <View style={styles.metricsGrid}>
                  {sortedMetrics(ctx, order[ctx]).map((m) => {
                    const r = metrics[ctx][m.id];
                    const strengthValue = ctx === 'strength' && m.id === 'done' ? doneLive : `${r.value}${r.unit ? ` ${r.unit}` : ''}`;
                    return (
                      <MetricTile
                        key={m.id}
                        variant={isStrength ? 'strength' : 'card'}
                        icon={m.icon}
                        label={r.label ?? m.label}
                        value={isStrength ? strengthValue : r.value}
                        unit={isStrength ? '' : r.unit}
                        big={!isStrength && m.big}
                        bars={r.bars}
                        toggled={enabled[ctx][m.id]}
                        onPress={() => toggleMetric(ctx, m.id)}
                        widthPct={isStrength ? 31 : ctx === 'home' ? (m.big ? 48 : 31) : 48}
                      />
                    );
                  })}
                </View>
              )}
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
  arrangeBtn: { minWidth: 34, alignItems: 'flex-end' },
  arrangeText: { fontFamily: fonts.semiBold, fontSize: 13.5, color: colors.accent200 },
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 },
  intro: { fontSize: 12, color: colors.neutral500, marginBottom: 6, fontFamily: fonts.regular, lineHeight: 17 },
  sectionSpacing: { marginTop: 18, marginBottom: 10 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  empty: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral500 },
});
