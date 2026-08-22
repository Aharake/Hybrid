// Calendar week-picker — pure port of the new Tracker design's getWeekDays()/
// weekRangeLabel(). The mock "today" is a fixed anchor (not the real device date),
// matching the source's demo data exactly (see plan's "Mock 'today' stays fixed" note).

export type DayLabel = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export const DAY_LABELS: DayLabel[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DAY_FULL_MAP: Record<DayLabel, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

export const TODAY_DAY_SHORT: DayLabel = 'Sat';
export const TODAY_DAY_FULL = DAY_FULL_MAP[TODAY_DAY_SHORT];

export const WEEKLY_PATTERN: Record<DayLabel, { strength: boolean; running: boolean }> = {
  Mon: { strength: true, running: false },
  Tue: { strength: false, running: true },
  Wed: { strength: true, running: false },
  Thu: { strength: true, running: false },
  Fri: { strength: false, running: false },
  Sat: { strength: true, running: true },
  Sun: { strength: false, running: false },
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// The Monday of week-offset 0 — a fixed demo anchor, not `new Date()`.
const BASE_MONDAY = new Date(2026, 9, 23); // Oct 23 2026

export interface WeekDay {
  label: DayLabel;
  date: string;
  month: number;
  year: number;
  strength: boolean;
  running: boolean;
  isToday: boolean;
}

export function getWeekDays(weekOffset: number): WeekDay[] {
  const monday = new Date(BASE_MONDAY.getTime());
  monday.setDate(monday.getDate() + weekOffset * 7);
  return DAY_LABELS.map((label, i) => {
    const d = new Date(monday.getTime());
    d.setDate(d.getDate() + i);
    const pattern = WEEKLY_PATTERN[label];
    return {
      label,
      date: String(d.getDate()),
      month: d.getMonth(),
      year: d.getFullYear(),
      strength: pattern.strength,
      running: pattern.running,
      isToday: weekOffset === 0 && label === TODAY_DAY_SHORT,
    };
  });
}

export function weekRangeLabel(weekOffset: number): string {
  const days = getWeekDays(weekOffset);
  const first = days[0];
  const last = days[6];
  if (first.month === last.month) return `${first.date}–${last.date} ${MONTH_NAMES[first.month].slice(0, 3)}`;
  if (first.year === last.year) {
    return `${first.date} ${MONTH_NAMES[first.month].slice(0, 3)} – ${last.date} ${MONTH_NAMES[last.month].slice(0, 3)}`;
  }
  return `${first.date} ${MONTH_NAMES[first.month].slice(0, 3)} ${first.year} – ${last.date} ${MONTH_NAMES[last.month].slice(0, 3)} ${last.year}`;
}

export function isViewingToday(viewWeekOffset: number, viewDay: DayLabel): boolean {
  return viewWeekOffset === 0 && viewDay === TODAY_DAY_SHORT;
}
