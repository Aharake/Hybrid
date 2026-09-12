// Ring color-by-threshold — pure port of RING_THRESHOLD_COLORS/getRingThresholdStyle/getRingStatusLabel.

export interface RingThresholdStyle {
  color: string;
  light: string;
  dim: string;
  glow: string;
}

const RING_THRESHOLD_COLORS: Record<'green' | 'orange' | 'red', RingThresholdStyle> = {
  green: { color: '#4cd964', light: '#a8ecb4', dim: '#2c2c30', glow: 'rgba(76,217,100,0.3)' },
  orange: { color: '#e2872f', light: '#f3c68f', dim: '#2c2c30', glow: 'rgba(226,135,47,0.3)' },
  red: { color: '#e5484d', light: '#f4a5a8', dim: '#2c2c30', glow: 'rgba(229,72,77,0.3)' },
};

export function getRingThresholdStyle(pct: number): RingThresholdStyle {
  const p = pct * 100;
  if (p >= 66) return RING_THRESHOLD_COLORS.green;
  if (p >= 33) return RING_THRESHOLD_COLORS.orange;
  return RING_THRESHOLD_COLORS.red;
}

export function getRingStatusLabel(pct: number): string {
  const p = pct * 100;
  if (p >= 66) return 'Good';
  if (p >= 33) return 'Fair';
  return 'Low';
}
