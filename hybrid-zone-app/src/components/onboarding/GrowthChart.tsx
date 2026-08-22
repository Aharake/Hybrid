import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors, fonts } from '@/theme/tokens';

// Matches Onboarding.html's .growth-chart (motivation-1 screen) — path data ported verbatim.
export function GrowthChart() {
  return (
    <View>
      <View style={styles.chart}>
        <Svg width="100%" height="100%" viewBox="0 0 320 170" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="areaFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
              <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path
            d="M0,150 C60,140 90,118 130,88 C170,58 190,28 240,14 C270,7 300,3 320,2 L320,170 L0,170 Z"
            fill="url(#areaFade)"
          />
          <Path
            d="M0,150 C60,140 90,118 130,88 C170,58 190,28 240,14 C270,7 300,3 320,2"
            fill="none"
            stroke="#fff"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Circle cx={320} cy={2} r={5} fill="#fff" />
          <Path
            d="M0,158 C80,160 160,162 240,164 C270,165 300,166 320,167"
            fill="none"
            stroke="#5c5c60"
            strokeWidth={2}
            strokeDasharray="1 6"
            strokeLinecap="round"
          />
          <Circle cx={320} cy={167} r={4} fill="#5c5c60" />
        </Svg>
        <View style={styles.pillTop}>
          <Text style={styles.pillTopText}>With Hybrid Zone</Text>
        </View>
        <View style={styles.pillGhost}>
          <Text style={styles.pillGhostText}>Without it</Text>
        </View>
      </View>
      <Text style={styles.axis}>TIME →</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { position: 'relative', marginTop: 38, height: 190 },
  pillTop: {
    position: 'absolute',
    right: 8,
    top: 0,
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pillTopText: { fontFamily: fonts.bold, fontSize: 12.5, color: '#000' },
  pillGhost: {
    position: 'absolute',
    left: 8,
    bottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pillGhostText: { fontFamily: fonts.bold, fontSize: 12.5, color: colors.textDim },
  axis: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 8,
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: colors.textDimmer,
    letterSpacing: 1,
  },
});
