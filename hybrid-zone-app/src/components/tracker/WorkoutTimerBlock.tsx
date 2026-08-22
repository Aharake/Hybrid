import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrCycleIcon } from '@/icons';
import { fmtClock } from '@/engine/trackerFormat';
import { useTrackerStore } from '@/store/trackerStore';

const PRESETS: [string, number][] = [
  ['1m', 60],
  ['1.5m', 90],
  ['3m', 180],
];

// Matches Tracker (new).html's .wo-timer-block — the live workout elapsed timer +
// its independent rest timer (presets/custom/start/pause/resume/finish). Both
// timers run as per-second `useEffect` intervals here, driving store state.
export function WorkoutTimerBlock() {
  const { workout, restTimer, tickWorkout, tickRestTimer, selectRestPreset, openCustomRest, adjustRestTimer, startRestTimer, pauseRestTimer, resumeRestTimer, finishRestTimer } =
    useTrackerStore();

  useEffect(() => {
    if (!workout.active) return;
    const id = setInterval(tickWorkout, 1000);
    return () => clearInterval(id);
  }, [workout.active, tickWorkout]);

  useEffect(() => {
    if (restTimer.status !== 'running') return;
    const id = setInterval(tickRestTimer, 1000);
    return () => clearInterval(id);
  }, [restTimer.status, tickRestTimer]);

  return (
    <View style={styles.block}>
      <View style={styles.top}>
        <View style={styles.stat}>
          <View style={styles.statTop}>
            <TrCycleIcon size={15} color={colors.neutral500} />
            <Text style={styles.statTopText}>{restTimer.cycles}</Text>
          </View>
          <Text style={styles.statLbl}>Rests</Text>
        </View>
        <View style={[styles.stat, styles.statRight]}>
          <Text style={styles.statTopText}>{fmtClock(workout.seconds)}</Text>
          <Text style={styles.statLbl}>Elapsed</Text>
        </View>
      </View>

      <Text style={styles.restDisplay}>{fmtClock(restTimer.remaining)}</Text>

      <View style={styles.presetRow}>
        {PRESETS.map(([label, secs]) => {
          const selected = !restTimer.customOpen && restTimer.duration === secs;
          return (
            <Pressable key={label} style={[styles.presetBtn, selected && styles.presetBtnSelected]} onPress={() => selectRestPreset(secs)}>
              <Text style={styles.presetBtnText}>{label}</Text>
            </Pressable>
          );
        })}
        <Pressable style={[styles.presetBtn, restTimer.customOpen && styles.presetBtnSelected]} onPress={openCustomRest}>
          <Text style={styles.presetBtnText}>Custom</Text>
        </Pressable>
      </View>

      {restTimer.customOpen && (
        <View style={styles.customStepper}>
          <Pressable style={styles.adjBtn} onPress={() => adjustRestTimer(-15)}>
            <Text style={styles.adjText}>–</Text>
          </Pressable>
          <Text style={styles.customVal}>{fmtClock(restTimer.duration)}</Text>
          <Pressable style={styles.adjBtn} onPress={() => adjustRestTimer(15)}>
            <Text style={styles.adjText}>+</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.controls}>
        {restTimer.status === 'idle' && (
          <Pressable style={[styles.restBtn, styles.restBtnFull, { backgroundColor: colors.text }]} onPress={startRestTimer}>
            <Text style={[styles.restBtnText, { color: colors.bg }]}>Start</Text>
          </Pressable>
        )}
        {restTimer.status === 'running' && (
          <>
            <Pressable style={[styles.restBtn, { backgroundColor: colors.text }]} onPress={pauseRestTimer}>
              <Text style={[styles.restBtnText, { color: colors.bg }]}>Pause</Text>
            </Pressable>
            <Pressable style={[styles.restBtn, { backgroundColor: colors.strength }]} onPress={finishRestTimer}>
              <Text style={[styles.restBtnText, { color: '#fff' }]}>Finish</Text>
            </Pressable>
          </>
        )}
        {restTimer.status === 'paused' && (
          <>
            <Pressable style={[styles.restBtn, { backgroundColor: colors.text }]} onPress={resumeRestTimer}>
              <Text style={[styles.restBtnText, { color: colors.bg }]}>Resume</Text>
            </Pressable>
            <Pressable style={[styles.restBtn, { backgroundColor: colors.strength }]} onPress={finishRestTimer}>
              <Text style={[styles.restBtnText, { color: '#fff' }]}>Finish</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, marginBottom: 18 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  stat: { gap: 4 },
  statRight: { alignItems: 'flex-end' },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statTopText: { fontFamily: fonts.bold, fontSize: 19, color: colors.text },
  statLbl: { fontSize: 12.5, fontFamily: fonts.semiBold, color: colors.neutral500 },
  restDisplay: { textAlign: 'center', fontFamily: fonts.extraBold, fontSize: 50, letterSpacing: -0.5, color: colors.text, marginVertical: 17 },
  presetRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 18 },
  presetBtn: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 999 },
  presetBtnSelected: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.divider },
  presetBtnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  customStepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: -8, marginBottom: 16 },
  adjBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  adjText: { fontSize: 15, color: colors.text },
  customVal: { fontFamily: fonts.semiBold, fontSize: 13.5, color: colors.neutral500, minWidth: 60, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 10 },
  restBtn: { flex: 1, alignItems: 'center', borderRadius: 999, paddingVertical: 13 },
  restBtnFull: { flex: 1 },
  restBtnText: { fontFamily: fonts.semiBold, fontSize: 14 },
});
