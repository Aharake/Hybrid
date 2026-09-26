// Local-time date helpers. Everything the tracker shows about "today", "this
// week" or "N days ago" goes through here so it always reflects the real
// device date — never a fixed one.

export const DAY_MS = 86_400_000;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Monday 00:00 (local) of the week containing `ts`.
export function startOfWeekMonday(ts: number): number {
  const d = new Date(startOfDay(ts));
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

// Local calendar-day key, e.g. "2026-09-20" — safe for grouping across DST.
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// Whole local calendar days from `fromTs` to `toTs` (0 = same day).
export function daysBetween(fromTs: number, toTs: number): number {
  return Math.round((startOfDay(toTs) - startOfDay(fromTs)) / DAY_MS);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function monthYear(ts: number): string {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function clockTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

// "8:15 AM" for today, "Yesterday", "3 days ago", then a plain date once it's
// over a month old.
export function relativeWhen(ts: number, now: number = Date.now()): string {
  const days = daysBetween(ts, now);
  if (days <= 0) return clockTime(ts);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return shortDate(ts);
}

// `ts` moved by whole local calendar days (safe across DST changes).
export function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}
