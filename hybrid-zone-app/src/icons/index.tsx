// SVG icons ported 1:1 from Onboarding.html's and Tracker.html's `ICO` dicts
// (path data unchanged). Icons shared between the two mockups (back/check/x/plus/
// minus/layers, and barbell/run standing in for Tracker's identical "strength"/
// "running"/"volume" icons) are defined once above and reused.

import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function BackIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CheckIcon({ size = 15, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function XIcon({ size = 16, color = '#48484a' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function BarbellIcon({ size = 20, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Rect x={1} y={9.5} width={3} height={5} rx={1} />
      <Rect x={5.5} y={7.5} width={2.4} height={9} rx={1} />
      <Rect x={16} y={7.5} width={2.4} height={9} rx={1} />
      <Rect x={20} y={9.5} width={3} height={5} rx={1} />
      <Rect x={9} y={10.8} width={6} height={2.4} rx={1} />
    </Svg>
  );
}

export function RunIcon({ size = 20, color = '#0a84ff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={14.5} cy={4.2} r={2} />
      <Path d="M12.8 8.2l3 1.6 3.4-1.2.7 1.9-4.2 1.6-2-1v3l3 2.6-1 4.3-1.9-.4.7-3.1-3.4-3-1.6 2.8 1.4 2.6-1.7.9-2-3.7 3-5.1-2.6-1.4-1 1.7-1.7-.9 2-3.5 4-1.2z" />
    </Svg>
  );
}

export function InfoIcon({ size = 16, color = '#98989f' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.6} />
      <Path d="M12 11v5.5M12 8v.01" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function PlusIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.3} strokeLinecap="round" />
    </Svg>
  );
}

export function MinusIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14" stroke={color} strokeWidth={2.3} strokeLinecap="round" />
    </Svg>
  );
}

export function TargetIcon({ size = 14, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={1.6} />
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={1.6} />
      <Circle cx={12} cy={12} r={1.3} fill={color} />
    </Svg>
  );
}

export function GridIcon({ size = 14, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Rect x={3} y={3} width={7} height={7} rx={1.6} />
      <Rect x={14} y={3} width={7} height={7} rx={1.6} />
      <Rect x={3} y={14} width={7} height={7} rx={1.6} />
      <Rect x={14} y={14} width={7} height={7} rx={1.6} />
    </Svg>
  );
}

export function LayersIcon({ size = 14, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l9 5-9 5-9-5 9-5z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M3 13l9 5 9-5" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function TrendIcon({ size = 14, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 17l6-6 4 4 8-8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 6h6v6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function StarIcon({ size = 15, color = '#ffd60a' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9L5.7 21l1.7-7L2 9.2l7.1-.6L12 2z" />
    </Svg>
  );
}

export function CheckCircleBigIcon({ size = 26, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 13l4 4L19 7" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ---- New Tracker redesign icons (the `I` dict) ----
// Note: several old-design controls (step +/-, delete ✕) are plain text glyphs in
// the new source, not icons — those are rendered as Text, not ported here.

export function TrHomeIcon({ size = 22, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 11.5L12 4l8 7.5" />
      <Path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    </Svg>
  );
}

export function TrStrengthIcon({ size = 22, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 9v6M4 10v4M17.5 9v6M20 10v4M8.5 12h7" />
    </Svg>
  );
}

export function TrRunningIcon({ size = 22, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={15} cy={4.5} r={1.8} fill={color} stroke="none" />
      <Path d="M13.5 7L10.5 13M13.5 7L16 6L17.5 8M13.5 7L11 9L9 8M10.5 13L13 15L12 19M10.5 13L8 16L5 17" />
    </Svg>
  );
}

export function TrAccountIcon({ size = 22, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={3.2} />
      <Path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </Svg>
  );
}

export function TrPlusIcon({ size = 20, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function TrChevRightIcon({ size = 14, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 5l7 7-7 7" />
    </Svg>
  );
}

export function TrChevLeftIcon({ size = 16, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}

export function TrChevDownIcon({ size = 14, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function TrMoreIcon({ size = 16, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={5} cy={12} r={1.6} />
      <Circle cx={12} cy={12} r={1.6} />
      <Circle cx={19} cy={12} r={1.6} />
    </Svg>
  );
}

export function TrCheckIcon({ size = 14, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l4.5 4.5L19 7" />
    </Svg>
  );
}

export function TrPlayIcon({ size = 16, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5.5v13l11-6.5-11-6.5z" />
    </Svg>
  );
}

export function TrClockIcon({ size = 15, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function TrRunSmallIcon({ size = 18, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={6} cy={6} r={2} />
      <Circle cx={18} cy={18} r={2} />
      <Path d="M6 8c0 5 12 3 12 8" />
    </Svg>
  );
}

export function TrSlidersIcon({ size = 17, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <Circle cx={13.5} cy={7} r={2} />
      <Circle cx={7.5} cy={17} r={2} />
    </Svg>
  );
}

export function TrStepsIcon({ size = 12, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={8} />
      <Circle cx={12} cy={12} r={3.3} />
    </Svg>
  );
}

export function TrPaceIcon({ size = 12, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 15a8 8 0 1 1 16 0" />
      <Path d="M12 15l4-5" />
    </Svg>
  );
}

export function TrMonthIcon({ size = 12, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 7h11a3 3 0 0 1 3 3v2" />
      <Path d="M20 17H9a3 3 0 0 1-3-3v-2" />
      <Path d="M7 4l-3 3 3 3M17 20l3-3-3-3" />
    </Svg>
  );
}

export function TrBurnIcon({ size = 12, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 21c-4 0-6-2.5-6-6 0-3 2-4.5 2.5-7C9 10 10 11 10 8c0-2 1-4 2-5 0 3 1 4 2.5 6 1.5 2 3 3.5 3 6 0 3.5-2 6-6 6z" />
    </Svg>
  );
}

export function TrDoneIcon({ size = 12, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={5.5} width={16} height={14.5} rx={2} />
      <Path d="M4 9.5h16M9 14l2 2 4-4" />
    </Svg>
  );
}

export function TrHeartrateIcon({ size = 12, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 12h4l2-5 4 10 2-5h6" />
    </Svg>
  );
}

export function TrTrendIcon({ size = 12, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 17l5-6 4 3 7-9" />
    </Svg>
  );
}

export function TrSleepIcon({ size = 12, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 14a8 8 0 1 1-8-10 6.5 6.5 0 0 0 8 10z" />
    </Svg>
  );
}

export function TrScissorsMenuIcon({ size = 15, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12z" />
    </Svg>
  );
}

export function TrChartIcon({ size = 28, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 19V9M12 19V5M20 19v-7" />
    </Svg>
  );
}

export function TrHistoryIcon({ size = 28, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 2" />
    </Svg>
  );
}

export function TrBellIcon({ size = 17, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14.5 6 10.5z" />
      <Path d="M10 19a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function TrDevicesIcon({ size = 17, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 7h4l10 10h4M3 17h4l3-3.5M14 7h3" />
      <Path d="M18 4l3 3-3 3M18 14l3 3-3 3" />
    </Svg>
  );
}

export function TrShieldIcon({ size = 17, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    </Svg>
  );
}

export function TrSignOutIcon({ size = 15, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M15 16l4-4-4-4M19 12H8" />
    </Svg>
  );
}

export function TrElevationIcon({ size = 12, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 18l6-11 4 6 3-4 5 9z" />
    </Svg>
  );
}

export function TrCadenceIcon({ size = 12, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3v4M12 17v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M3 12h4M17 12h4M4.2 19.8L7 17M17 7l2.8-2.8" />
    </Svg>
  );
}

export function TrMuscleIcon({ size = 26, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 4.5c-1.6 0-2.8 1.3-2.8 2.9 0 .9.4 1.7 1 2.2-1.3.7-2.2 2-2.2 3.6V19a1 1 0 0 0 1 1h1.5v-3.5c0-1 .8-1.8 1.8-1.8h9.4c1 0 1.8.8 1.8 1.8V20H21a1 1 0 0 0 1-1v-5.8c0-1.6-.9-2.9-2.2-3.6.6-.5 1-1.3 1-2.2 0-1.6-1.2-2.9-2.8-2.9-1.3 0-2.4.9-2.7 2.1a5 5 0 0 0-4.6 0C10.4 5.4 9.3 4.5 8 4.5z" />
    </Svg>
  );
}

export function TrTrendUpIcon({ size = 10, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  );
}

export function TrCycleIcon({ size = 15, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5" />
      <Path d="M18 3v4h-4M6 21v-4h4" />
    </Svg>
  );
}

export function TrCyclingIcon({ size = 18, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={5.5} cy={17.5} r={3.5} />
      <Circle cx={18.5} cy={17.5} r={3.5} />
      <Path d="M5.5 17.5L10 8h6l2.5 4.5M10 8l2.5 4.5h-6" />
    </Svg>
  );
}

export function TrSwimIcon({ size = 18, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 17c1.5 1.5 3 1.5 4.5 0s3-1.5 4.5 0 3 1.5 4.5 0 3-1.5 4.5 0" />
      <Circle cx={17} cy={6} r={1.6} />
      <Path d="M9 13l4-3 2 2 4-2" />
    </Svg>
  );
}

export function TrWalkIcon({ size = 18, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={13} cy={5} r={1.6} />
      <Path d="M10 22l1.5-6-2-2 1-5 3 2 3 5-3 2 1 4M9 10L6 12v4" />
    </Svg>
  );
}

export function TrOtherIcon({ size = 18, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={6} cy={12} r={1.6} />
      <Circle cx={12} cy={12} r={1.6} />
      <Circle cx={18} cy={12} r={1.6} />
    </Svg>
  );
}

export function TrTrophyIcon({ size = 12, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <Path d="M7 5H4a3 3 0 0 0 3 5M17 5h3a3 3 0 0 1-3 5" />
      <Path d="M12 14v3M9 21h6M9 20h6v1H9z" />
    </Svg>
  );
}

export function TrFlameIcon({ size = 12, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3c1 3-3 4-3 8a3 3 0 0 0 6 0c1 1 1.5 2.5 1.5 4a4.5 4.5 0 0 1-9 0c0-4 2-5 2-8 1 1 1.5 2 1.5 2s1-3 1-6z" />
    </Svg>
  );
}

export function TrLayersIcon({ size = 12, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l9 5-9 5-9-5 9-5z" />
      <Path d="M3 13l9 5 9-5" />
    </Svg>
  );
}

export function TrSwapIcon({ size = 15, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 3l4 4-4 4" />
      <Path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <Path d="M7 21l-4-4 4-4" />
      <Path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </Svg>
  );
}

export function TrTrashIcon({ size = 15, color = '#f5f5f6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13" />
    </Svg>
  );
}
