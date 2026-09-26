import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { fonts } from '@/theme/trackerTokens';

interface Props {
  pct: number; // 0-1 (can exceed 1, e.g. training load)
  color: string;
  dim: string;
  size: number;
}

const TICKS = 28;

// Static tick-mark dial (same look as the Home dial in RingCluster) — used
// for the small decorative gauges in Account's Data Highlights, where a live
// tick-up animation isn't needed.
export function MiniRing({ pct, color, dim, size }: Props) {
  const displayPct = Math.round(pct * 100);
  const lit = Math.round(Math.min(1, Math.max(0, pct)) * TICKS);
  const c = size / 2;
  const outer = c - 2;
  const inner = outer - Math.max(6, size * 0.11);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {Array.from({ length: TICKS }, (_, i) => {
          const a = ((-90 + (360 * i) / TICKS) * Math.PI) / 180;
          return (
            <Line
              key={i}
              x1={c + inner * Math.cos(a)}
              y1={c + inner * Math.sin(a)}
              x2={c + outer * Math.cos(a)}
              y2={c + outer * Math.sin(a)}
              stroke={i < lit ? color : dim}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.val, { color, fontSize: size > 70 ? 16 : 15 }]}>
          {displayPct}
          {pct <= 1 ? '%' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  val: { fontFamily: fonts.bold, fontWeight: '700' },
});
