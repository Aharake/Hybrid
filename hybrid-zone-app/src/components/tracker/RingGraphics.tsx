import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

// The Home ring designs, parametrised by size so the detail popup can show the
// very same graphics, just larger — rather than a different-looking ring.

const BASE = 190; // the size everything below was designed at
const TICKS = 44;
const ARC_START = 150; // degrees, measured clockwise from 3 o'clock — a 240° dial open at the bottom
const ARC_SPAN = 240;
const CROP = 34; // how much of the dial's empty bottom is cut off, at BASE size

// A tick-mark dial for the weekly goal. Children are laid over its centre.
export function DialGauge({ pct, color, dim, size = BASE, children }: { pct: number; color: string; dim: string; size?: number; children?: React.ReactNode }) {
  const k = size / BASE;
  const outer = size / 2 - 4 * k;
  const inner = outer - 15 * k;
  const lit = Math.round(Math.min(1, Math.max(0, pct)) * TICKS);
  const c = size / 2;
  return (
    <View style={{ width: size, height: size - CROP * k, overflow: 'hidden', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {Array.from({ length: TICKS }, (_, i) => {
          const a = ((ARC_START + (ARC_SPAN * i) / (TICKS - 1)) * Math.PI) / 180;
          const on = i < lit;
          // The last lit tick is drawn a little longer, like a needle tip.
          const innerR = on && i === lit - 1 ? inner - 5 * k : inner;
          return (
            <Line
              key={i}
              x1={c + innerR * Math.cos(a)}
              y1={c + innerR * Math.sin(a)}
              x2={c + outer * Math.cos(a)}
              y2={c + outer * Math.sin(a)}
              stroke={on ? color : dim}
              strokeWidth={4 * k}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { top: 58 * k, alignItems: 'center' }]} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

// The segmented bar used for Consistency and Volume Trend.
export function SegmentBar({ pct, color, dim, segments = 12, height = 8, gap = 4 }: { pct: number; color: string; dim: string; segments?: number; height?: number; gap?: number }) {
  const lit = Math.round(Math.min(1, Math.max(0, pct)) * segments);
  return (
    <View style={{ flexDirection: 'row', gap }}>
      {Array.from({ length: segments }, (_, i) => (
        <View key={i} style={{ flex: 1, height, borderRadius: Math.max(3, height / 3), backgroundColor: i < lit ? color : dim }} />
      ))}
    </View>
  );
}
