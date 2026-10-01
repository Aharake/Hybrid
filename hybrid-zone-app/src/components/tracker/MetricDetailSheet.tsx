import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts } from '@/theme/trackerTokens';
import { Sheet } from './Sheet';
import { useViewRingData } from './RingCluster';
import { useTrackerStore, METRIC_INFO } from '@/store/trackerStore';
import { CONSISTENCY_READY_DAYS, VOLUME_READY_DAYS } from '@/engine/stats';

// A plain circular progress ring — used both for the one big "headline" ring
// and the smaller Weekly Goal breakdown rings below it.
function Ring({ size, stroke, pct, color, dim, children }: { size: number; stroke: number; pct: number; color: string; dim: string; children?: React.ReactNode }) {
  const r = size / 2 - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const fill = Math.min(1, Math.max(0, pct));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={dim} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fill)}
          fill="none"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
}

// Lifts / Running / Steps — only the ones that actually count toward this
// account's Weekly Goal get a ring (see weeklyGoalWeights in engine/stats.ts),
// so this renders 1, 2 or 3 depending on what's scheduled and connected.
const PART_COLOR = { lift: colors.strength, run: colors.running, steps: '#2dd4bf' } as const;
const PART_LABEL = { lift: 'Lifts', run: 'Running', steps: 'Steps' } as const;

function GoalBreakdown({ parts }: { parts: { lift: number | null; run: number | null; steps: number | null } }) {
  const entries = (['lift', 'run', 'steps'] as const).filter((k) => parts[k] !== null);
  return (
    <View style={styles.breakdownRow}>
      {entries.map((k) => (
        <View key={k} style={styles.breakdownItem}>
          <Ring size={74} stroke={7} pct={parts[k]!} color={PART_COLOR[k]} dim={colors.neutral300}>
            <Text style={styles.breakdownPct}>{Math.round(parts[k]! * 100)}%</Text>
          </Ring>
          <Text style={styles.breakdownLabel}>{PART_LABEL[k]}</Text>
        </View>
      ))}
    </View>
  );
}

const RING_COLOR = { goal: colors.rcGoal, consistency: colors.rcConsistency, volume: colors.rcVolume } as const;
const RING_DIM = { goal: colors.rcGoalDim, consistency: colors.rcConsistencyDim, volume: colors.rcVolumeDim } as const;

export function MetricDetailSheet() {
  const { metricDetailOpen, closeMetricDetail } = useTrackerStore();
  const data = useViewRingData();

  if (!metricDetailOpen) return null;

  const info = METRIC_INFO[metricDetailOpen];
  const pct = data[metricDetailOpen];
  const ready = metricDetailOpen === 'goal' ? true : metricDetailOpen === 'consistency' ? data.consistencyReady : data.volumeReady;
  const readyDays = metricDetailOpen === 'consistency' ? CONSISTENCY_READY_DAYS : VOLUME_READY_DAYS;
  const daysLeft = Math.max(0, readyDays - data.daysTracked);

  return (
    <Sheet visible onClose={closeMetricDetail} zIndex={25} tall title={info.title}>
      <View style={styles.ringSection}>
        <Ring size={200} stroke={16} pct={ready ? pct : 0} color={RING_COLOR[metricDetailOpen]} dim={RING_DIM[metricDetailOpen]}>
          {ready ? (
            <>
              <Text style={styles.bigNum}>
                {Math.round(pct * 100)}
                <Text style={styles.bigPct}>%</Text>
              </Text>
              <Text style={styles.bigCaption}>THIS WEEK</Text>
            </>
          ) : (
            <>
              <Text style={styles.buildingNum}>{daysLeft}</Text>
              <Text style={styles.bigCaption}>{daysLeft === 1 ? 'DAY LEFT' : 'DAYS LEFT'}</Text>
            </>
          )}
        </Ring>

        {metricDetailOpen === 'goal' && ready && <GoalBreakdown parts={data.goalParts} />}
      </View>

      <Text style={styles.body}>{info.body}</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  ringSection: { alignItems: 'center', gap: 22, paddingVertical: 8 },
  bigNum: { fontFamily: fonts.semiBold, fontSize: 46, lineHeight: 50, color: colors.text, letterSpacing: -1 },
  bigPct: { fontSize: 22, color: colors.neutral500 },
  bigCaption: { fontFamily: fonts.semiBold, fontSize: 10.5, letterSpacing: 1, color: colors.neutral500, marginTop: 2 },
  buildingNum: { fontFamily: fonts.semiBold, fontSize: 52, lineHeight: 56, color: colors.text },
  breakdownRow: { flexDirection: 'row', gap: 22 },
  breakdownItem: { alignItems: 'center', gap: 8 },
  breakdownPct: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  breakdownLabel: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.neutral500 },
  body: { fontSize: 13.5, lineHeight: 21, color: colors.neutral600, fontFamily: fonts.regular, marginTop: 20 },
});
