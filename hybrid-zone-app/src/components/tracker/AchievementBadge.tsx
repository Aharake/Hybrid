import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';
import { colors, fonts } from '@/theme/trackerTokens';
import type { BadgeItem } from '@/store/trackerStore';

function hexPoints(cx: number, cy: number, r: number): string {
  return [0, 60, 120, 180, 240, 300]
    .map((a) => {
      const rad = ((a - 90) * Math.PI) / 180;
      return `${(cx + r * Math.cos(rad)).toFixed(2)},${(cy + r * Math.sin(rad)).toFixed(2)}`;
    })
    .join(' ');
}

interface Props {
  item: BadgeItem;
  shape: 'hex' | 'disc';
  size: number;
}

// Matches the source's renderBadgeShape/renderBadge — three badge families
// (activity milestones, personal records, firsts) all rendered through this
// one component, differentiated by shape + tier only.
export function AchievementBadge({ item, shape, size }: Props) {
  const isSolid = item.tier === 'solid';
  const isLocked = item.tier === 'locked';
  const stroke = isLocked ? colors.neutral400 : colors.text;
  const fill = isSolid ? colors.text : colors.surface;
  const contentColor = isLocked ? colors.neutral500 : isSolid ? colors.bg : colors.text;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  return (
    <View style={[styles.wrap, { width: size }]}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {shape === 'hex' ? (
            <Polygon
              points={hexPoints(cx, cy, r)}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.5}
              strokeDasharray={isLocked ? '4 3' : undefined}
              opacity={isLocked ? 0.5 : 1}
            />
          ) : (
            <Circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1.5} strokeDasharray={isLocked ? '4 3' : undefined} opacity={isLocked ? 0.5 : 1} />
          )}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.content]}>
          <Image source={require('../../../assets/logo-mark.png')} style={[styles.mark, { opacity: isLocked ? 0.6 : 1, tintColor: contentColor }]} resizeMode="contain" />
          <Text style={[styles.label, { color: contentColor, fontSize: size > 70 ? 18 : 13 }]}>{item.label}</Text>
        </View>
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.name, { fontSize: size > 70 ? 11.5 : 10, color: isLocked ? colors.neutral500 : colors.text }]}>{item.name}</Text>
        {!!(item.sub || isLocked) && <Text style={[styles.sub, { fontSize: size > 70 ? 10.5 : 9 }]}>{item.sub || 'Locked'}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  content: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  mark: { width: 14, height: 14 },
  label: { fontFamily: fonts.bold, fontWeight: '700' },
  textWrap: { alignItems: 'center' },
  name: { fontFamily: fonts.semiBold, textAlign: 'center', lineHeight: 14 },
  sub: { color: colors.neutral500, marginTop: 1 },
});
