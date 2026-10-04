import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/theme/trackerTokens';
import { TrLockIcon } from '@/icons';
import { Sheet } from './Sheet';
import { DialGauge, SegmentBar } from './RingGraphics';
import { MiniRing } from './MiniRing';
import { useViewRingData } from './RingCluster';
import { useTrackerStore, METRIC_INFO } from '@/store/trackerStore';
import { CONSISTENCY_READY_DAYS, VOLUME_READY_DAYS } from '@/engine/stats';

// Lifts / Running / Steps — only the parts that count toward this person's
// goal get a ring, so this shows 3, 2 or just 1 of them.
const PART_COLOR = { lift: colors.strength, run: colors.running, steps: '#2dd4bf' } as const;
const PART_LABEL = { lift: 'Lifts', run: 'Running', steps: 'Steps' } as const;

function GoalBreakdown({ parts }: { parts: { lift: number | null; run: number | null; steps: number | null } }) {
  const entries = (['lift', 'run', 'steps'] as const).filter((k) => parts[k] !== null);
  return (
    <View style={styles.breakdownRow}>
      {entries.map((k) => (
        <View key={k} style={styles.breakdownItem}>
          <MiniRing pct={parts[k]!} color={PART_COLOR[k]} dim={colors.neutral300} size={84} />
          <Text style={styles.breakdownLabel}>{PART_LABEL[k]}</Text>
        </View>
      ))}
    </View>
  );
}

const RING_COLOR = { goal: colors.rcGoal, consistency: colors.rcConsistency, volume: colors.rcVolume } as const;
const RING_DIM = { goal: colors.rcGoalDim, consistency: colors.rcConsistencyDim, volume: colors.rcVolumeDim } as const;

// The popup behind each Home ring. The ring graphic is the same one the Home
// page uses (the tick dial for the goal, the segmented bar for the other two),
// just bigger; below it, the parts that make it up, then a short explanation.
export function MetricDetailSheet() {
  const { metricDetailOpen, closeMetricDetail, openGoalSetup } = useTrackerStore();
  const data = useViewRingData();

  if (!metricDetailOpen) return null;

  const info = METRIC_INFO[metricDetailOpen];
  const pct = data[metricDetailOpen];
  const ready = metricDetailOpen === 'goal' ? true : metricDetailOpen === 'consistency' ? data.consistencyReady : data.volumeReady;
  const readyDays = metricDetailOpen === 'consistency' ? CONSISTENCY_READY_DAYS : VOLUME_READY_DAYS;
  const daysLeft = Math.max(0, readyDays - data.daysTracked);

  return (
    <Sheet visible onClose={closeMetricDetail} zIndex={25} tall title={info.title}>
      <View style={styles.hero}>
        {metricDetailOpen === 'goal' ? (
          <DialGauge size={290} pct={pct} color={RING_COLOR.goal} dim={RING_DIM.goal}>
            <Text style={styles.bigNum}>
              {Math.round(pct * 100)}
              <Text style={styles.bigPct}>%</Text>
            </Text>
            <Text style={styles.bigCaption}>OF WEEKLY GOAL</Text>
          </DialGauge>
        ) : (
          <View style={styles.barBlock}>
            {ready ? (
              <Text style={styles.bigNum}>
                {Math.round(pct * 100)}
                <Text style={styles.bigPct}>%</Text>
              </Text>
            ) : (
              <View style={styles.lockedRow}>
                <TrLockIcon size={20} color={colors.neutral500} />
                <Text style={styles.lockedText}>{daysLeft === 1 ? 'Unlocks in 1 day' : `Unlocks in ${daysLeft} days`}</Text>
              </View>
            )}
            <SegmentBar pct={ready ? pct : 0} color={RING_COLOR[metricDetailOpen]} dim={RING_DIM[metricDetailOpen]} height={22} gap={6} />
          </View>
        )}
      </View>

      {metricDetailOpen === 'goal' && <GoalBreakdown parts={data.goalParts} />}

      <Text style={styles.body}>{info.body}</Text>

      {metricDetailOpen === 'goal' && (
        <Pressable
          style={styles.editBtn}
          onPress={() => {
            closeMetricDetail();
            openGoalSetup();
          }}
        >
          <Text style={styles.editBtnText}>Edit goal</Text>
        </Pressable>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', justifyContent: 'center', paddingTop: 6, paddingBottom: 4 },
  barBlock: { alignSelf: 'stretch', gap: 22, paddingVertical: 30 },
  bigNum: { fontFamily: fonts.semiBold, fontSize: 64, lineHeight: 68, color: colors.text, letterSpacing: -2, textAlign: 'center' },
  bigPct: { fontSize: 28, color: colors.neutral500 },
  bigCaption: { fontFamily: fonts.semiBold, fontSize: 11, letterSpacing: 1.2, color: colors.neutral500, marginTop: 2 },
  lockedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  lockedText: { fontFamily: fonts.semiBold, fontSize: 22, color: colors.neutral500 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'center', gap: 26, marginTop: 4 },
  breakdownItem: { alignItems: 'center', gap: 8 },
  breakdownLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.neutral500 },
  body: { fontSize: 14, lineHeight: 21, color: colors.neutral600, fontFamily: fonts.regular, textAlign: 'center', marginTop: 10, paddingHorizontal: 6 },
  editBtn: { alignSelf: 'center', borderWidth: 1, borderColor: colors.neutral400, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 28, marginTop: 6 },
  editBtnText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
});
