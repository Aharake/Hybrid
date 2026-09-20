import React, { useEffect, useRef } from 'react';
import { Alert, BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrLayersIcon, TrPlayIcon } from '@/icons';
import { fmtClock } from '@/engine/trackerFormat';
import { distanceUnitLabel, distanceValueOnly, fmtDistance, fmtPaceFromSecPerKm, UnitSystem } from '@/engine/units';
import { useTrackerStore } from '@/store/trackerStore';
import { RunRouteMap } from './RunRouteMap';

const HANDLE_SIZE = 58;

function SlideToStart({ onComplete }: { onComplete: () => void }) {
  const [trackWidth, setTrackWidth] = React.useState(0);
  const translateX = useSharedValue(0);

  // The 150ms delay has to happen here, on the JS thread, once runOnJS has
  // already handed off — calling setTimeout from inside the worklet below
  // (i.e. wrapping runOnJS itself in a setTimeout) runs runOnJS outside the
  // worklet's own synchronous call, which trips Reanimated's reentrancy
  // guard and crashes the app (SIGABRT, WorkletsReentrancyCheck).
  const complete = () => setTimeout(onComplete, 150);

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      const maxDelta = Math.max(0, trackWidth - HANDLE_SIZE);
      translateX.value = Math.max(0, Math.min(maxDelta, e.translationX));
    })
    .onEnd(() => {
      const maxDelta = Math.max(0, trackWidth - HANDLE_SIZE);
      if (translateX.value >= maxDelta * 0.7) {
        translateX.value = maxDelta;
        runOnJS(complete)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const handleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: HANDLE_SIZE + translateX.value }));

  return (
    <View style={styles.slideTrack} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.slideFill, fillStyle]} />
      <View style={styles.slideLabel} pointerEvents="none">
        <Text style={styles.slideLabelText}>Slide to Start</Text>
        <Text style={styles.slideLabelArrows}>{'›››'}</Text>
      </View>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.slideHandle, handleStyle]}>
          <TrPlayIcon size={16} color={colors.text} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// Matches Tracker (new).html's runTrackerOverlay() — a state-driven overlay
// independent of which screen/route is "current" (mirrors the source's
// S.runTrackerOpen flag), mounted once at the navigator root.
export function RunTrackerOverlay() {
  const {
    runTrackerOpen,
    runStatus,
    run,
    runType,
    distanceGoal,
    intervalMeters,
    intervalReps,
    closeRunTracker,
    finishRun,
    beginRunCountdown,
    tickCountdown,
    tickRun,
    toggleRunPause,
    openRunSetup,
    countdownVal,
    unitSystem,
    gpsIssue,
  } = useTrackerStore();
  const insets = useSafeAreaInsets();

  const handleDiscard = () => {
    if (run.elapsed > 5) {
      Alert.alert('Discard this run?', "It won't be saved.", [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: closeRunTracker },
      ]);
    } else {
      closeRunTracker();
    }
  };

  // A run with no recorded distance can't be saved — say so instead of
  // silently throwing the run away.
  const handleFinish = () => {
    if (run.distance > 0) {
      finishRun();
      return;
    }
    Alert.alert('No distance was recorded', "Nothing was tracked, so this run can't be saved. Check that location access is on.", [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Discard run', style: 'destructive', onPress: closeRunTracker },
    ]);
  };

  // Android's back button closes the run screen (with the same confirmation)
  // instead of popping whatever screen is underneath it.
  useEffect(() => {
    if (!runTrackerOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleDiscard();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runTrackerOpen, run.elapsed]);

  // Location was refused, so no route or distance will be recorded.
  useEffect(() => {
    if (gpsIssue !== 'denied') return;
    Alert.alert('Location is off', 'Hyvo needs location access to record your route and distance. Turn it on in Settings, then start the run again.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]);
  }, [gpsIssue]);

  // Tell the runner when they've hit the goal they set.
  const goalAnnounced = useRef(false);
  useEffect(() => {
    if (runStatus === 'idle') goalAnnounced.current = false;
    if (goalAnnounced.current || runStatus !== 'running') return;
    if (runType === 'distance' && run.distance >= distanceGoal) {
      goalAnnounced.current = true;
      Alert.alert('Goal reached', `You've covered ${fmtDistance(distanceGoal, unitSystem, 0)}. Keep going or finish when you're ready.`);
    } else if (runType === 'interval' && run.intervalCount >= intervalReps) {
      goalAnnounced.current = true;
      Alert.alert('Intervals complete', `That's all ${intervalReps} reps. Nice work.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.distance, run.intervalCount, runStatus]);

  useEffect(() => {
    if (runStatus !== 'countdown') return;
    const id = setInterval(tickCountdown, 1000);
    return () => clearInterval(id);
  }, [runStatus, tickCountdown]);

  useEffect(() => {
    if (runStatus !== 'running') return;
    const id = setInterval(tickRun, 1000);
    return () => clearInterval(id);
  }, [runStatus, tickRun]);

  if (!runTrackerOpen) return null;

  const isActive = runStatus === 'running' || runStatus === 'paused';
  const hasGoal = runType === 'distance';
  const hasInterval = runType === 'interval';
  const goalPillText =
    runType === 'open' ? 'Set a Goal' : runType === 'distance' ? `${fmtDistance(distanceGoal, unitSystem, 0)} Goal` : `${intervalReps} × ${intervalMeters}m`;
  const toGoal = Math.max(0, distanceGoal - run.distance);
  const gpsText = gpsIssue === 'denied' ? 'Location off' : !isActive ? null : run.route.length > 0 ? 'GPS' : 'Finding GPS…';

  return (
    <View style={styles.overlay}>
      <View style={styles.mapFull}>
        {run.route.length > 1 ? (
          <RunRouteMap route={run.route} live style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.mapBgWrap}>
            <Text style={styles.mapBgText}>{isActive ? 'Finding GPS…' : 'Live map'}</Text>
          </View>
        )}

        <View style={[styles.topRow, { top: insets.top + 12 }]}>
          <Pressable style={styles.iconBtn} onPress={handleDiscard}>
            <Text style={styles.iconBtnText}>✕</Text>
          </Pressable>
          <View style={styles.statusPills}>
            {gpsText && (
              <View style={[styles.statusPill, gpsIssue === 'denied' && { backgroundColor: 'rgba(229,72,77,0.85)' }]}>
                <Text style={styles.statusPillText}>{gpsText}</Text>
              </View>
            )}
          </View>
        </View>

        {runStatus === 'idle' && (
          <Pressable style={[styles.goalPill, { top: insets.top + 64 }]} onPress={openRunSetup}>
            <Text style={styles.goalPillText}>{goalPillText}</Text>
          </Pressable>
        )}

        {isActive && (
          <View style={[styles.distOverlay, { top: insets.top + 104 }]} pointerEvents="none">
            <Text style={styles.distNum}>{distanceValueOnly(run.distance, unitSystem, 2)}</Text>
            <Text style={styles.distLbl}>Distance ({distanceUnitLabel(unitSystem)})</Text>
          </View>
        )}

        {isActive && hasGoal && (
          <View style={styles.toGoalRow} pointerEvents="none">
            <View style={styles.toGoalBadge}>
              <Text style={styles.toGoalVal}>{fmtDistance(toGoal, unitSystem)}</Text>
              <Text style={styles.toGoalLbl}>to Goal</Text>
            </View>
          </View>
        )}

        {runStatus === 'countdown' && (
          <View style={styles.countdownWrap}>
            <Text style={styles.countdownNum}>{countdownVal}</Text>
          </View>
        )}
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(20, insets.bottom + 8) }]}>
        {runStatus === 'idle' && <SlideToStart onComplete={beginRunCountdown} />}
        {runStatus === 'countdown' && <Text style={styles.getReady}>Get ready…</Text>}
        {runStatus === 'running' && (
          <>
            <StatsRow run={run} distance={run.distance} hasInterval={hasInterval} intervalReps={intervalReps} unitSystem={unitSystem} />
            <Pressable style={[styles.btnFilled, { marginTop: 0 }]} onPress={toggleRunPause}>
              <Text style={styles.btnFilledText}>Pause</Text>
            </Pressable>
          </>
        )}
        {runStatus === 'paused' && (
          <>
            <StatsRow run={run} distance={run.distance} hasInterval={hasInterval} intervalReps={intervalReps} unitSystem={unitSystem} />
            <View style={styles.btnRow}>
              <Pressable style={styles.btnOutline} onPress={handleFinish}>
                <Text style={styles.btnOutlineText}>Finish</Text>
              </Pressable>
              <Pressable style={styles.btnFilled} onPress={toggleRunPause}>
                <Text style={styles.btnFilledText}>Continue</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function StatsRow({
  run,
  distance,
  hasInterval,
  intervalReps,
  unitSystem,
}: {
  run: { elapsed: number; intervalCount: number };
  distance: number;
  hasInterval: boolean;
  intervalReps: number;
  unitSystem: UnitSystem;
}) {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statMini}>
        {/* Average pace so far: moving time over distance covered. */}
        <Text style={styles.statMiniVal}>{distance > 0.02 ? fmtPaceFromSecPerKm(run.elapsed / distance, unitSystem) : '—'}</Text>
        <Text style={styles.statMiniLbl}>Pace /{distanceUnitLabel(unitSystem)}</Text>
      </View>
      <View style={styles.statMini}>
        <Text style={styles.statMiniVal}>{fmtClock(run.elapsed)}</Text>
        <Text style={styles.statMiniLbl}>Time</Text>
      </View>
      {hasInterval && (
        <View style={styles.statMini}>
          <TrLayersIcon size={12} color={colors.neutral500} />
          <Text style={styles.statMiniVal}>
            {run.intervalCount}/{intervalReps}
          </Text>
          <Text style={styles.statMiniLbl}>Intervals</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, zIndex: 40 },
  mapFull: { flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: colors.surface },
  mapBgWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  mapBgText: { color: colors.neutral400, fontSize: 13, fontFamily: fonts.regular },
  topRow: { position: 'absolute', top: 18, left: 18, right: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: '#fff', fontSize: 15 },
  statusPills: { gap: 8, alignItems: 'flex-end' },
  statusPill: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 },
  statusPillText: { color: '#fff', fontSize: 11, fontFamily: fonts.semiBold },
  goalPill: { position: 'absolute', top: 70, left: '50%', marginLeft: -60, backgroundColor: colors.text, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 18, zIndex: 2 },
  goalPillText: { color: colors.bg, fontSize: 12.5, fontFamily: fonts.semiBold, textAlign: 'center' },
  distOverlay: { position: 'absolute', left: 0, right: 0, top: 110, alignItems: 'center', zIndex: 2 },
  distNum: { fontFamily: fonts.bold, fontSize: 56, color: '#fff', lineHeight: 58 },
  distLbl: { fontSize: 12.5, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  toGoalRow: { position: 'absolute', left: 0, right: 0, bottom: 18, alignItems: 'center', zIndex: 2 },
  toGoalBadge: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
  toGoalVal: { fontFamily: fonts.semiBold, fontSize: 13.5, color: '#fff' },
  toGoalLbl: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  countdownWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 3 },
  countdownNum: { fontFamily: fonts.bold, fontSize: 72, color: '#fff' },
  bottom: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, backgroundColor: colors.bg },
  getReady: { textAlign: 'center', fontSize: 13, fontFamily: fonts.semiBold, color: colors.neutral500, paddingVertical: 19 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 12, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  statMini: { alignItems: 'center', gap: 4 },
  statMiniVal: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text },
  statMiniLbl: { fontSize: 10.5, color: colors.neutral500 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnOutline: { flex: 1, alignItems: 'center', borderRadius: 999, paddingVertical: 15, borderWidth: 1.5, borderColor: colors.running },
  btnOutlineText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.running },
  btnFilled: { flex: 1, alignItems: 'center', borderRadius: 999, paddingVertical: 15, backgroundColor: colors.running, marginTop: 0 },
  btnFilledText: { fontFamily: fonts.semiBold, fontSize: 14, color: '#fff' },
  slideTrack: { position: 'relative', height: 58, borderRadius: 999, backgroundColor: colors.text, overflow: 'hidden' },
  slideFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.running, borderRadius: 999 },
  slideLabel: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  slideLabelText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.bg },
  slideLabelArrows: { fontSize: 14, color: colors.bg, opacity: 0.6 },
  slideHandle: { position: 'absolute', left: 3, top: 3, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
