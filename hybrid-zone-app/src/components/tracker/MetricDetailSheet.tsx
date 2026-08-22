import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/theme/trackerTokens';
import { Sheet } from './Sheet';
import { useViewRingData } from './RingCluster';
import { useTrackerStore, METRIC_INFO } from '@/store/trackerStore';

// Matches Tracker (new).html's metricDetailSheet() (opened from RingCluster's labels).
export function MetricDetailSheet() {
  const { metricDetailOpen, closeMetricDetail } = useTrackerStore();
  const ringData = useViewRingData();

  if (!metricDetailOpen) return null;

  const info = METRIC_INFO[metricDetailOpen];
  const liveValue = `${Math.round(ringData[metricDetailOpen] * 100)}%`;

  return (
    <Sheet
      visible
      onClose={closeMetricDetail}
      zIndex={25}
      headerExtra={
        <View>
          <Text style={styles.kicker}>How it's calculated</Text>
          <Text style={styles.title}>
            {info.title} — {liveValue}
          </Text>
        </View>
      }
    >
      <Text style={styles.body}>{info.body}</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.accent200, marginBottom: 4, fontFamily: fonts.regular },
  title: { fontFamily: fonts.medium, fontSize: 19, color: colors.text },
  body: { fontSize: 13.5, lineHeight: 21, color: colors.neutral600, fontFamily: fonts.regular },
});
