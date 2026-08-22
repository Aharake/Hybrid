// Zustand store mirroring Onboarding.html's global `S` object (lines 251-259).
// Navigation itself stays with React Navigation (see OnboardingNavigator) — this
// store only holds the answers collected along the way.

import { create } from 'zustand';
import {
  Discipline,
  Dow,
  Level,
  WeekSchedule,
  decDay as decDayInSchedule,
  emptyWeek,
  incDay as incDayInSchedule,
  initSchedule as buildInitialSchedule,
  tapDay as tapDayInSchedule,
} from '@/engine/schedule';
import { Equipment, RunningGoal, SplitValue, StrengthGoal } from '@/engine/planPreview';
import { FocusOption } from '@/engine/split';

export interface OnboardingFields {
  strengthExp: Level | null;
  includeRunning: boolean;
  runningExp: Level | null;
  strengthGoal: StrengthGoal | null;
  equipment: Equipment | null;
  focus: FocusOption | null;
  split: SplitValue | null;
  customSplitLabel: string | null;
  runningGoal: RunningGoal | null;
  dayPickMode: Discipline;
  schedule: WeekSchedule;
  planTier: 'annual' | 'monthly';
}

interface OnboardingStore extends OnboardingFields {
  setField: <K extends keyof OnboardingFields>(key: K, value: OnboardingFields[K]) => void;
  setMode: (mode: Discipline) => void;
  tapDay: (day: Dow) => void;
  incDay: (type: Discipline) => void;
  decDay: (type: Discipline) => void;
  acceptRunning: () => void;
  declineRunning: () => void;
  selectCustomSplit: (label: string) => void;
  initScheduleFromAnswers: () => void;
  reset: () => void;
}

const initialFields: OnboardingFields = {
  strengthExp: null,
  includeRunning: false,
  runningExp: null,
  strengthGoal: null,
  equipment: null,
  focus: null,
  split: null,
  customSplitLabel: null,
  runningGoal: null,
  dayPickMode: 'strength',
  schedule: emptyWeek(),
  planTier: 'annual',
};

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  ...initialFields,

  setField: (key, value) => set({ [key]: value } as Partial<OnboardingFields>),

  setMode: (mode) => set({ dayPickMode: mode }),

  tapDay: (day) => set((state) => ({ schedule: tapDayInSchedule(state.schedule, day, state.dayPickMode) })),

  incDay: (type) => set((state) => ({ schedule: incDayInSchedule(state.schedule, type) })),

  decDay: (type) => set((state) => ({ schedule: decDayInSchedule(state.schedule, type) })),

  acceptRunning: () => set({ includeRunning: true }),

  declineRunning: () => {
    const { strengthExp, runningExp } = get();
    set({ includeRunning: false, schedule: buildInitialSchedule(strengthExp, false, runningExp) });
  },

  selectCustomSplit: (label) => set({ split: 'custom', customSplitLabel: label }),

  initScheduleFromAnswers: () => {
    const { strengthExp, includeRunning, runningExp } = get();
    set({ schedule: buildInitialSchedule(strengthExp, includeRunning, runningExp) });
  },

  reset: () => set(initialFields),
}));
