// Flat route list for the new Tracker design — much smaller than the old design's
// 21 routes since most of its separate screens (swap/add exercise, filters,
// run setup) became in-screen sheets/overlays here instead. All screen state
// lives in trackerStore, so every route takes no params.
export type TrackerStackParamList = {
  HomeTab: undefined;
  StrengthTab: undefined;
  SessionOverview: undefined;
  ExerciseDetail: undefined;
  RunningTab: undefined;
  ViewAllOverview: undefined;
  AllActivities: undefined;
  AccountTab: undefined;
};

export const TAB_ROUTES = ['HomeTab', 'StrengthTab', 'RunningTab', 'AccountTab'] as const;
export type TabRouteName = (typeof TAB_ROUTES)[number];
