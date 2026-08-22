import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrChevLeftIcon, TrChevRightIcon } from '@/icons';
import { getWeekDays, weekRangeLabel } from '@/engine/calendar';
import { useTrackerStore } from '@/store/trackerStore';

// Matches Tracker (new).html's scheduleWidget() — used identically on Home,
// Strength, and Running (same view state, shared store fields).
export function CalendarWeekWidget() {
  const { viewWeekOffset, viewDay, selectDay, shiftWeek, resetToToday, isViewingToday } = useTrackerStore();
  const days = getWeekDays(viewWeekOffset);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Pressable style={styles.navBtn} onPress={() => shiftWeek(-1)}>
          <TrChevLeftIcon size={16} color={colors.neutral500} />
        </Pressable>
        <Text style={styles.month}>{weekRangeLabel(viewWeekOffset)}</Text>
        <Pressable style={styles.navBtn} onPress={() => shiftWeek(1)}>
          <TrChevRightIcon size={16} color={colors.neutral500} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {days.map((d) => {
          const selected = d.label === viewDay; // `days` is already scoped to viewWeekOffset
          return (
            <Pressable
              key={d.label}
              style={[styles.cell, selected && styles.cellActive]}
              onPress={() => selectDay(viewWeekOffset, d.label)}
            >
              <Text style={[styles.dayLabel, selected && styles.dayLabelActive]}>{d.label[0]}</Text>
              <Text style={[styles.dateNum, selected && styles.dateNumActive]}>{d.date}</Text>
              <View style={styles.dots}>
                {d.strength && d.running ? (
                  <View style={styles.dashSplit}>
                    <View style={[styles.dashHalf, { backgroundColor: colors.strength }]} />
                    <View style={[styles.dashHalf, { backgroundColor: colors.running }]} />
                  </View>
                ) : d.strength ? (
                  <View style={[styles.dash, { backgroundColor: colors.strength }]} />
                ) : d.running ? (
                  <View style={[styles.dash, { backgroundColor: colors.running }]} />
                ) : null}
              </View>
              {d.isToday && !selected && <View style={styles.todayDot} />}
            </Pressable>
          );
        })}
      </View>
      {!isViewingToday() && (
        <Pressable onPress={resetToToday}>
          <Text style={styles.todayLink}>Jump to Today</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingTop: 16, paddingBottom: 14, paddingHorizontal: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  month: { fontFamily: fonts.medium, fontSize: 13, color: colors.text, letterSpacing: 0.2 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', gap: 3 },
  cell: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 9, borderRadius: 14, position: 'relative' },
  cellActive: { backgroundColor: colors.secondary },
  dayLabel: { fontSize: 9.5, fontFamily: fonts.semiBold, color: colors.neutral500 },
  dayLabelActive: { color: colors.bg, opacity: 0.6 },
  dateNum: { fontFamily: fonts.semiBold, fontSize: 14.5, color: colors.text },
  dateNumActive: { color: colors.bg },
  dots: { height: 5, alignItems: 'center', justifyContent: 'center' },
  dash: { width: 16, height: 4, borderRadius: 2 },
  dashSplit: { width: 16, height: 4, borderRadius: 2, flexDirection: 'row', overflow: 'hidden' },
  dashHalf: { flex: 1, height: 4 },
  todayDot: { position: 'absolute', bottom: 3, left: '50%', marginLeft: -2, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.secondary },
  todayLink: { textAlign: 'center', fontSize: 11.5, fontFamily: fonts.semiBold, color: colors.accent200, marginTop: 10 },
});
