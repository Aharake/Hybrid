// Calendar week-picker (getWeekDays()/weekRangeLabel()). "Today" and the visible
// weeks are always derived from the real device date.
import { startOfWeekMonday } from './dates';

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

// Read at call time (not cached at import) so a session left open past
// midnight still resolves the right day.
export function getTodayShort(): DayLabel {
  return DAY_LABELS[(new Date().getDay() + 6) % 7];
}
export function getTodayFull(): string {
  return DAY_FULL_MAP[getTodayShort()];
}

export const FULL_TO_DAY_LABEL: Record<string, DayLabel> = Object.fromEntries(
  DAY_LABELS.map((label) => [DAY_FULL_MAP[label], label]),
) as Record<string, DayLabel>;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];


export interface WeekDay {
  label: DayLabel;
  date: string;
  month: number;
  year: number;
  strength: boolean;
  running: boolean;
  isToday: boolean;
}

// strengthDays/runningDays mark the days the user's current program schedules
// a strength session / run on (sessions[key].day / Object.keys(runSessions)).
export function getWeekDays(weekOffset: number, strengthDays?: Set<DayLabel>, runningDays?: Set<DayLabel>): WeekDay[] {
  const monday = new Date(startOfWeekMonday(Date.now()));
  monday.setDate(monday.getDate() + weekOffset * 7);
  const today = getTodayShort();
  return DAY_LABELS.map((label, i) => {
    const d = new Date(monday.getTime());
    d.setDate(d.getDate() + i);
    return {
      label,
      date: String(d.getDate()),
      month: d.getMonth(),
      year: d.getFullYear(),
      strength: strengthDays ? strengthDays.has(label) : false,
      running: runningDays ? runningDays.has(label) : false,
      isToday: weekOffset === 0 && label === today,
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
  return viewWeekOffset === 0 && viewDay === getTodayShort();
}

// Local midnight timestamp of a given day in the week `weekOffset` weeks from now.
export function dateOfWeekDay(weekOffset: number, label: DayLabel): number {
  const d = new Date(startOfWeekMonday(Date.now()));
  d.setDate(d.getDate() + weekOffset * 7 + DAY_LABELS.indexOf(label));
  return d.getTime();
}
