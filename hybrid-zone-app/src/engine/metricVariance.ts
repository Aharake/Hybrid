// When viewing a past/future day (not "today"), overview metrics show a
// deterministic seeded variation instead of the live value — pure port of
// viewSeed()/varyValue()/varyDisplayValue()/getMetricValue()/getMetricBars().

import { seededRandom } from './exerciseHistory';

export function viewSeedFor(viewWeekOffset: number, viewDay: string): string {
  return `${viewWeekOffset}_${viewDay}`;
}

export function varyValue(base: number, viewSeed: string, seedSuffix: string, spread = 0.25): number {
  const r = seededRandom(viewSeed + seedSuffix);
  return base * (1 - spread + r * spread * 2);
}

export function varyDisplayValue(str: string, viewSeed: string, seedSuffix: string, spread = 0.25): string {
  const m = String(str).match(/^(-?\d[\d,]*\.?\d*)(.*)$/);
  if (!m) return str;
  const num = parseFloat(m[1].replace(/,/g, ''));
  const varied = varyValue(num, viewSeed, seedSuffix, spread);
  let out: string;
  if (m[1].includes(',')) out = Math.round(varied).toLocaleString();
  else if (m[1].includes('.')) out = varied.toFixed(1);
  else out = String(Math.max(0, Math.round(varied)));
  return out + m[2];
}

export function getMetricValue(value: string, id: string, viewSeed: string, isViewingToday: boolean): string {
  if (isViewingToday) return value;
  return varyDisplayValue(value, viewSeed, id, 0.25);
}

export function getMetricBars(bars: number[], id: string, viewSeed: string, isViewingToday: boolean): number[] {
  if (isViewingToday) return bars;
  return bars.map((h, i) => Math.max(4, Math.min(100, Math.round(varyValue(h, viewSeed, id + '_bar' + i, 0.35)))));
}
