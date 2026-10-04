import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fonts } from '@/theme/trackerTokens';
import { BarbellIcon, RunIcon, TrStepsIcon } from '@/icons';
import { Sheet } from './Sheet';
import { DialGauge } from './RingGraphics';
import { MiniRing } from './MiniRing';
import { useTrackerStore } from '@/store/trackerStore';
import { useHealthStore } from '@/store/healthStore';
import { healthSourceName } from '@/engine/health';
import { plannedCounts } from '@/engine/stats';

type PageId = 'intro' | 'counts' | 'steps';

const STEP_MIN = 2000;
const STEP_MAX = 30000;
const STEP_STEP = 500;
const STEP_PRESETS = [5000, 7500, 10000, 12500];

const PART_COLOR = { lift: colors.strength, run: colors.running, steps: '#2dd4bf' } as const;

function Row({
  icon,
  title,
  sub,
  value,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  value: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <View style={[styles.row, disabled && { opacity: 0.55 }]}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Switch value={value} disabled={disabled} onValueChange={onChange} trackColor={{ false: colors.neutral400, true: colors.green }} thumbColor="#fff" ios_backgroundColor={colors.neutral400} />
    </View>
  );
}

// The Weekly Goal's setup — a short flow the first time the ring is tapped,
// and again whenever "Edit goal" is pressed. It chooses what counts toward the
// ring (lifts always do; running and steps are optional) and the daily step
// target. Until it's been completed once, the Home ring shows no data.
export function GoalSetupSheet() {
  const { goalSetupOpen, closeGoalSetup, weeklyGoal, setWeeklyGoal, sessions, runSessions } = useTrackerStore();
  const { supported, connected, connect } = useHealthStore();
  const planned = plannedCounts(sessions, runSessions);
  const editing = weeklyGoal.onboarded;

  const [page, setPage] = useState(0);
  const [includeRun, setIncludeRun] = useState(true);
  const [includeSteps, setIncludeSteps] = useState(true);
  const [stepGoal, setStepGoal] = useState(10000);
  const [saving, setSaving] = useState(false);

  // Start from the saved choices every time it opens.
  useEffect(() => {
    if (!goalSetupOpen) return;
    setPage(0);
    setIncludeRun(planned.runs > 0 && weeklyGoal.includeRun);
    setIncludeSteps(supported && weeklyGoal.includeSteps);
    setStepGoal(weeklyGoal.stepGoal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalSetupOpen]);

  const pages: PageId[] = ['intro', 'counts', ...(includeSteps ? (['steps'] as PageId[]) : [])];
  const current = pages[Math.min(page, pages.length - 1)];
  const isLast = page >= pages.length - 1;

  const finish = async () => {
    setSaving(true);
    // Steps come from the health app; ask for access now if it isn't connected.
    if (includeSteps && supported && !connected) await connect();
    setWeeklyGoal({ onboarded: true, includeRun: includeRun && planned.runs > 0, includeSteps: includeSteps && supported, stepGoal });
    setSaving(false);
    closeGoalSetup();
  };

  const adjustSteps = (delta: number) => setStepGoal((g) => Math.min(STEP_MAX, Math.max(STEP_MIN, g + delta)));

  if (!goalSetupOpen) return null;

  const parts: ('lift' | 'run' | 'steps')[] = [
    ...(planned.strength > 0 ? (['lift'] as const) : []),
    ...(includeRun && planned.runs > 0 ? (['run'] as const) : []),
    ...(includeSteps ? (['steps'] as const) : []),
  ];

  return (
    <Sheet visible onClose={closeGoalSetup} zIndex={60} tall title={editing ? 'Edit Weekly Goal' : 'Weekly Goal'}>
      <View style={styles.dots}>
        {pages.map((p, i) => (
          <View key={p} style={[styles.dot, i === Math.min(page, pages.length - 1) && styles.dotActive]} />
        ))}
      </View>

      {current === 'intro' && (
        <View style={styles.page}>
          <DialGauge size={230} pct={0.72} color={colors.rcGoal} dim={colors.rcGoalDim}>
            <Text style={styles.previewNum}>
              72<Text style={styles.previewPct}>%</Text>
            </Text>
            <Text style={styles.previewCaption}>PREVIEW</Text>
          </DialGauge>
          <Text style={styles.h1}>One ring for your week</Text>
          <Text style={styles.body}>It fills as you complete your lifts, runs and steps. Set it up in a few taps.</Text>
        </View>
      )}

      {current === 'counts' && (
        <View style={styles.page}>
          {parts.length > 0 && (
            <View style={styles.previewRings}>
              {parts.map((k) => (
                <MiniRing key={k} pct={0.65} color={PART_COLOR[k]} dim={colors.neutral300} size={64} />
              ))}
            </View>
          )}
          <Text style={styles.h1}>What counts?</Text>
          <Text style={styles.body}>Choose what fills your ring.</Text>
          <View style={styles.rows}>
            <Row
              icon={<BarbellIcon size={18} color={colors.strength} />}
              title="Lifts"
              sub={planned.strength > 0 ? `${planned.strength} ${planned.strength === 1 ? 'session' : 'sessions'} a week` : 'Not in your plan'}
              value={planned.strength > 0}
              disabled
            />
            <Row
              icon={<RunIcon size={18} color={colors.running} />}
              title="Running"
              sub={planned.runs > 0 ? `${planned.runs} ${planned.runs === 1 ? 'run' : 'runs'} a week` : 'Not in your plan'}
              value={includeRun && planned.runs > 0}
              disabled={planned.runs === 0}
              onChange={setIncludeRun}
            />
            <Row
              icon={<TrStepsIcon size={18} color={PART_COLOR.steps} />}
              title="Steps"
              sub={`Counted from ${healthSourceName}`}
              value={includeSteps}
              disabled={!supported}
              onChange={setIncludeSteps}
            />
          </View>
        </View>
      )}

      {current === 'steps' && (
        <View style={styles.page}>
          <Text style={styles.h1}>Daily step goal</Text>
          <Text style={styles.body}>Steps are averaged across the week, so a slow day is balanced by a strong one.</Text>
          <View style={styles.stepper}>
            <Pressable style={styles.stepBtn} onPress={() => adjustSteps(-STEP_STEP)} hitSlop={8}>
              <Text style={styles.stepBtnText}>–</Text>
            </Pressable>
            <Text style={styles.stepNum}>{stepGoal.toLocaleString('en-US')}</Text>
            <Pressable style={styles.stepBtn} onPress={() => adjustSteps(STEP_STEP)} hitSlop={8}>
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
          <Text style={styles.stepSub}>steps a day · {(stepGoal * 7).toLocaleString('en-US')} a week</Text>
          <View style={styles.chips}>
            {STEP_PRESETS.map((n) => (
              <Pressable key={n} style={[styles.chip, stepGoal === n && styles.chipActive]} onPress={() => setStepGoal(n)}>
                <Text style={[styles.chipText, stepGoal === n && styles.chipTextActive]}>{n.toLocaleString('en-US')}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.footer}>
        {page > 0 && (
          <Pressable style={styles.backBtn} onPress={() => setPage((p) => Math.max(0, p - 1))} disabled={saving}>
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        )}
        <Pressable style={styles.nextBtn} onPress={isLast ? finish : () => setPage((p) => p + 1)} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={colors.bg} /> : <Text style={styles.nextBtnText}>{isLast ? (editing ? 'Save' : 'Start tracking') : 'Next'}</Text>}
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.neutral400 },
  dotActive: { width: 18, backgroundColor: colors.text },
  page: { alignItems: 'center', gap: 12, paddingTop: 8 },
  previewNum: { fontFamily: fonts.semiBold, fontSize: 52, lineHeight: 56, color: colors.text, letterSpacing: -1.5 },
  previewPct: { fontSize: 24, color: colors.neutral500 },
  previewCaption: { fontFamily: fonts.semiBold, fontSize: 10.5, letterSpacing: 1.2, color: colors.neutral500, marginTop: 2 },
  h1: { fontFamily: fonts.semiBold, fontSize: 22, color: colors.text, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.neutral600, textAlign: 'center', paddingHorizontal: 12 },
  previewRings: { flexDirection: 'row', gap: 14, marginBottom: 4 },
  rows: { alignSelf: 'stretch', gap: 10, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  rowSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.neutral500, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 14 },
  stepBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 24, lineHeight: 28, color: colors.text },
  stepNum: { fontFamily: fonts.semiBold, fontSize: 44, color: colors.text, letterSpacing: -1, minWidth: 150, textAlign: 'center' },
  stepSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral500 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 999, borderWidth: 1, borderColor: colors.neutral400 },
  chipActive: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.neutral600 },
  chipTextActive: { color: colors.bg },
  footer: { flexDirection: 'row', gap: 10, marginTop: 8 },
  backBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingVertical: 15, borderWidth: 1, borderColor: colors.neutral400 },
  backBtnText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  nextBtn: { flex: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 999, paddingVertical: 15, backgroundColor: colors.text },
  nextBtnText: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.bg },
});
