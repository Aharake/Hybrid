import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MetricTile } from '@/components/tracker/MetricTile';
import { MetricIcon } from '@/components/tracker/iconMap';
import { TrChevDownIcon, TrChevLeftIcon } from '@/icons';
import { colors, fonts, radius, typography } from '@/theme/trackerTokens';
import { DAY_FULL_MAP } from '@/engine/calendar';
import { useTrackerStore, sortedMetrics, MetricContext, SessionKey } from '@/store/trackerStore';
import { useMetrics } from '@/hooks/useStats';

const SECTION_LABELS: Record<MetricContext, string> = { home: 'Home', strength: 'Strength', running: 'Running' };

export function ViewAllOverview() {
  const navigation = useNavigation();
  const { sessions, viewDay, sets, enabled, order, toggleMetric, moveMetric, unitSystem } = useTrackerStore();
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
            ? "Use the arrows to move a tile up or down. That's the order it appears in on its page."
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
                  <View style={{ gap: 8 }}>
                    {visible.map((m, i) => {
                      const r = metrics[ctx][m.id];
                      const value = ctx === 'strength' && m.id === 'done' ? doneLive : r.value || '—';
                      return (
                        <View key={m.id} style={styles.arrangeRow}>
                          <MetricIcon id={m.icon} size={14} color={colors.neutral500} />
                          <Text style={styles.arrangeLabel} numberOfLines={1}>
                            {r.label ?? m.label}
                          </Text>
                          <Text style={styles.arrangeValue} numberOfLines={1}>
                            {value}
                            {r.unit && ctx !== 'strength' ? ` ${r.unit}` : ''}
                          </Text>
                          <Pressable style={[styles.arrow, i === 0 && styles.arrowOff]} disabled={i === 0} hitSlop={6} onPress={() => moveMetric(ctx, m.id, -1)}>
                            <View style={{ transform: [{ rotate: '180deg' }] }}>
                              <TrChevDownIcon size={13} color={colors.text} />
                            </View>
                          </Pressable>
                          <Pressable style={[styles.arrow, i === visible.length - 1 && styles.arrowOff]} disabled={i === visible.length - 1} hitSlop={6} onPress={() => moveMetric(ctx, m.id, 1)}>
                            <TrChevDownIcon size={13} color={colors.text} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
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
  arrangeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14 },
  arrangeLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, color: colors.text },
  arrangeValue: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral500, maxWidth: 90 },
  arrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  arrowOff: { opacity: 0.3 },
  empty: { fontFamily: fonts.regular, fontSize: 12.5, color: colors.neutral500 },
});
