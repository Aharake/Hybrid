// Maps the string icon keys used in trackerStore's data (OVERVIEW_METRICS,
// ACTIVITY_ICONS — mirroring the source's `icon: I.burn` pattern) to actual icon
// components, keeping the store free of JSX.

import React from 'react';
import {
  TrBurnIcon,
  TrDoneIcon,
  TrHeartrateIcon,
  TrTrendIcon,
  TrStepsIcon,
  TrSleepIcon,
  TrFlameIcon,
  TrTrophyIcon,
  TrLayersIcon,
  TrClockIcon,
  TrTrendUpIcon,
  TrRunSmallIcon,
  TrPaceIcon,
  TrMonthIcon,
  TrElevationIcon,
  TrStrengthIcon,
  TrCyclingIcon,
  TrSwimIcon,
  TrWalkIcon,
  TrOtherIcon,
} from '@/icons';

interface IconProps {
  size?: number;
  color?: string;
}

const MAP: Record<string, React.ComponentType<IconProps>> = {
  burn: TrBurnIcon,
  active: TrClockIcon, // "active" reuses the clock-face path (source's I.active === I.clock, identical SVG)
  done: TrDoneIcon,
  heartrate: TrHeartrateIcon,
  trend: TrTrendIcon,
  stepsIco: TrStepsIcon,
  sleep: TrSleepIcon,
  flameIco: TrFlameIcon,
  trophyIco: TrTrophyIcon,
  layersIco: TrLayersIcon,
  clock: TrClockIcon,
  trendUp: TrTrendUpIcon,
  runIcoSm: TrRunSmallIcon,
  paceIco: TrPaceIcon,
  monthIco: TrMonthIcon,
  elevation: TrElevationIcon,
  strengthActivityIco: TrStrengthIcon,
  cyclingIco: TrCyclingIcon,
  swimIco: TrSwimIcon,
  walkIco: TrWalkIcon,
  otherIco: TrOtherIcon,
};

export function MetricIcon({ id, size, color }: { id: string; size?: number; color?: string }) {
  const Comp = MAP[id] || TrDoneIcon;
  return <Comp size={size} color={color} />;
}
