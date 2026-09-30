import React from 'react';
import Svg, { Circle, Polyline as SvgPolyline } from 'react-native-svg';
import { normalizeRouteToUnitSquare } from '@/engine/gps';
import type { RoutePoint } from '@/engine/gps';
import { RoutePathSvg } from './RoutePathSvg';

interface Props {
  route: RoutePoint[];
  size: number;
  color?: string;
  strokeWidth?: number; // defaults to a weight that scales with the drawing's size
}

// The real, GPS-recorded shape of a route, scaled into a small square —
// used where embedding a full interactive map isn't practical (the Share
// Card's small glyph, captured via view-shot). Falls back to the old
// decorative curve for activities with no captured route (pre-GPS mock
// data, or an activity logged without location access).
export function RoutePolylineSvg({ route, size, color = '#f5f5f6', strokeWidth }: Props) {
  // Thin lines look flimsy once a route is drawn large, so the weight grows with the size.
  const width = strokeWidth ?? Math.max(3, size * 0.03);
  if (route.length < 2) return <RoutePathSvg size={size} color={color} />;

  const pad = size * 0.12;
  const inner = size - pad * 2;
  const points = normalizeRouteToUnitSquare(route).map((p) => `${(pad + p.x * inner).toFixed(1)},${(pad + p.y * inner).toFixed(1)}`);
  const first = points[0].split(',').map(Number);
  const last = points[points.length - 1].split(',').map(Number);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
      <SvgPolyline points={points.join(' ')} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={first[0]} cy={first[1]} r={width * 1.5} fill={color} />
      <Circle cx={last[0]} cy={last[1]} r={width * 1.5} fill="none" stroke={color} strokeWidth={width * 0.7} />
    </Svg>
  );
}
