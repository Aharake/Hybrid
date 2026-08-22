import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrChevRightIcon } from '@/icons';
import { Sheet } from './Sheet';
import { useTrackerStore, EXERCISE_POOL } from '@/store/trackerStore';

// Matches Tracker (new).html's swapSheet() (session overview's per-exercise swap icon).
export function SwapExerciseSheet() {
  const { swapContext, closeSwapExercise, sessions, performSwap } = useTrackerStore();
  if (!swapContext) return null;

  const ex = sessions[swapContext.sessionKey].exercises.find((e) => e.id === swapContext.exId);
  if (!ex) return null;

  const options = (ex.group === 'Custom' ? [] : EXERCISE_POOL[ex.group]).filter((n) => n !== ex.name);

  return (
    <Sheet
      visible
      onClose={closeSwapExercise}
      headerExtra={
        <View>
          <Text style={styles.kicker}>Swap Exercise</Text>
          <Text style={styles.title}>{ex.name}</Text>
        </View>
      }
    >
      <Text style={styles.sub}>Same muscle group ({ex.group}) — pick a replacement.</Text>
      <View style={{ gap: 8 }}>
        {options.map((name) => (
          <Pressable key={name} style={styles.option} onPress={() => performSwap(name)}>
            <Text style={styles.optionText}>{name}</Text>
            <TrChevRightIcon size={14} color={colors.text} />
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.accent200, marginBottom: 4, fontFamily: fonts.regular },
  title: { fontFamily: fonts.medium, fontSize: 17, color: colors.text },
  sub: { fontSize: 12, color: colors.neutral500, marginTop: -8, fontFamily: fonts.regular },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16 },
  optionText: { fontSize: 14.5, color: colors.text, fontFamily: fonts.medium },
});
