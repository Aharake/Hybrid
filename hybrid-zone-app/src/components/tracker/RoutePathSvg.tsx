import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

// Decorative route-path visualization (not real GPS data — this app has no
// location tracking) matching the source: an organic curved trace with a
// filled start dot and an outlined end dot.
export function RoutePathSvg({ size, color = '#f5f5f6' }: { size: number; color?: string }) {
  return (
    <Svg width={size} height={size * 0.62} viewBox="0 0 160 100" fill="none">
      <Path
        d="M18 68 C10 50 22 32 42 30 C58 28.5 55 44 42 46 C30 47.5 32 60 48 62 C75 65.5 70 30 100 24 C124 19 138 34 132 50"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={18} cy={68} r={4.5} fill={color} />
      <Circle cx={132} cy={50} r={4.5} fill="none" stroke={color} strokeWidth={3} />
    </Svg>
  );
}
