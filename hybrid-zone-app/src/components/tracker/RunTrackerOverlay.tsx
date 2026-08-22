import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrLayersIcon, TrPlayIcon } from '@/icons';
import { fmtClock } from '@/engine/trackerFormat';
import { useTrackerStore } from '@/store/trackerStore';

const HANDLE_SIZE = 58;
const ROUTE_PATH = 'M70 330 L70 270 L150 270 L150 210 L110 210 L110 150 L200 150 L200 190 L180 190';

function SlideToStart({ onComplete }: { onComplete: () => void }) {
  const [trackWidth, setTrackWidth] = React.useState(0);
  const translateX = useSharedValue(0);

  const complete = () => onComplete();

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      const maxDelta = Math.max(0, trackWidth - HANDLE_SIZE);
      translateX.value = Math.max(0, Math.min(maxDelta, e.translationX));
    })
    .onEnd(() => {
      const maxDelta = Math.max(0, trackWidth - HANDLE_SIZE);
      if (translateX.value >= maxDelta * 0.7) {
        translateX.value = maxDelta;
        setTimeout(() => runOnJS(complete)(), 150);
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
    beginRunCountdown,
    tickCountdown,
    tickRun,
    toggleRunPause,
    openRunSetup,
    countdownVal,
  } = useTrackerStore();

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
  const goalPillText = runType === 'open' ? 'Set a Goal' : runType === 'distance' ? `${distanceGoal} km Goal` : `${intervalReps} × ${intervalMeters}m`;
  const toGoal = Math.max(0, distanceGoal - run.distance);

  return (
    <View style={styles.overlay}>
      <View style={styles.mapFull}>
        <View style={styles.mapBgWrap}>
          <Text style={styles.mapBgText}>Live map</Text>
        </View>
        {isActive && (
          <Svg width="100%" height="100%" viewBox="0 0 300 400" preserveAspectRatio="none" style={StyleSheet.absoluteFillObject}>
            <Path d={ROUTE_PATH} fill="none" stroke={colors.running} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}

        <View style={styles.topRow}>
          <Pressable style={styles.iconBtn} onPress={closeRunTracker}>
            <Text style={styles.iconBtnText}>✕</Text>
          </Pressable>
          <View style={styles.statusPills}>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>+17°</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>GPS</Text>
            </View>
          </View>
        </View>

        {runStatus === 'idle' && (
          <Pressable style={styles.goalPill} onPress={openRunSetup}>
            <Text style={styles.goalPillText}>{goalPillText}</Text>
          </Pressable>
        )}

        {isActive && (
          <View style={styles.distOverlay} pointerEvents="none">
            <Text style={styles.distNum}>{run.distance.toFixed(2)}</Text>
            <Text style={styles.distLbl}>Distance (km)</Text>
          </View>
        )}

        {isActive && hasGoal && (
          <View style={styles.toGoalRow} pointerEvents="none">
            <View style={styles.toGoalBadge}>
              <Text style={styles.toGoalVal}>{toGoal.toFixed(1)} km</Text>
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

      <View style={styles.bottom}>
        {runStatus === 'idle' && <SlideToStart onComplete={beginRunCountdown} />}
        {runStatus === 'countdown' && <Text style={styles.getReady}>Get ready…</Text>}
        {runStatus === 'running' && (
          <>
            <StatsRow run={run} hasInterval={hasInterval} intervalReps={intervalReps} />
            <Pressable style={[styles.btnFilled, { marginTop: 0 }]} onPress={toggleRunPause}>
              <Text style={styles.btnFilledText}>Pause</Text>
            </Pressable>
          </>
        )}
        {runStatus === 'paused' && (
          <>
            <StatsRow run={run} hasInterval={hasInterval} intervalReps={intervalReps} />
            <View style={styles.btnRow}>
              <Pressable style={styles.btnOutline} onPress={closeRunTracker}>
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

function StatsRow({ run, hasInterval, intervalReps }: { run: { elapsed: number; intervalCount: number }; hasInterval: boolean; intervalReps: number }) {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statMini}>
        <Text style={styles.statMiniVal}>5'42"</Text>
        <Text style={styles.statMiniLbl}>Pace /km</Text>
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
