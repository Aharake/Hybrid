import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { rcCenterRing } from '@/engine/ringGeometry';
import { fonts } from '@/theme/trackerTokens';

interface Props {
  pct: number; // 0-1 (can exceed 1, e.g. training load)
  color: string;
  dim: string;
  size: number;
}

// Static (non-animated) version of RingCluster's center ring — used for the
// small decorative rings in Account's Data Highlights and the metric detail
// sheet's breakdown grid, where a live tick-up animation isn't needed.
export function MiniRing({ pct, color, dim, size }: Props) {
  const geo = rcCenterRing(pct, size);
  const displayPct = Math.round(pct * 100);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={geo.cx} cy={geo.cy} r={geo.radius} fill="none" stroke={dim} strokeWidth={geo.strokeWidth} />
        <Circle
          cx={geo.cx}
          cy={geo.cy}
          r={geo.radius}
          fill="none"
          stroke={color}
          strokeWidth={geo.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={geo.circumference}
          strokeDashoffset={geo.dashoffset}
          transform={`rotate(-90 ${geo.cx} ${geo.cy})`}
        />
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
