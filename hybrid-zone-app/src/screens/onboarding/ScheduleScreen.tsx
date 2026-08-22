import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Stepper } from '@/components/Stepper';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors, fonts, typography } from '@/theme/tokens';
import { BarbellIcon, InfoIcon, RunIcon, XIcon } from '@/icons';
import { DAY_NAMES, DAY_ORDER, Dow, Discipline, countDays } from '@/engine/schedule';
import type { OnboardingStackParamList } from '@/navigation/types';

function ModeSeg({ mode, onChange }: { mode: Discipline; onChange: (m: Discipline) => void }) {
  return (
    <View style={styles.modeSeg}>
      {(['strength', 'running'] as Discipline[]).map((m) => {
        const active = mode === m;
        return (
          <Pressable key={m} onPress={() => onChange(m)} style={[styles.modeBtn, active && styles.modeBtnActive]}>
            <Text style={[styles.modeBtnText, active && styles.modeBtnTextActive]}>
              {m === 'strength' ? 'Strength' : 'Running'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ScheduleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Schedule'>>();
  const { schedule, dayPickMode, setMode, tapDay, incDay, decDay } = useOnboardingStore();

  const sN = countDays(schedule, 'strength');
  const rN = countDays(schedule, 'running');
  const total = sN + rN;
  const msg =
    total <= 4
      ? 'Plenty of recovery room.'
      : total <= 6
        ? 'Balanced weekly volume.'
        : total <= 8
          ? 'Highly balanced weekly volume.'
          : 'Aggressive volume — make sure you can recover.';

  return (
    <OnboardingScreen progress={84} footer={<PrimaryButton label="Continue" onPress={() => navigation.navigate('Split')} />}>
      <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>Build your week</Text>
      <Text style={[typography.subtitle, { marginBottom: 22 }]}>
        Tap a day to assign it. Switch modes to layer strength and running on the same day.
      </Text>

      <ModeSeg mode={dayPickMode} onChange={setMode} />

      <View style={styles.dayGrid}>
        {DAY_ORDER.map((d: Dow) => {
          const c = schedule[d];
          const both = c.strength && c.running;
          const active = c.strength || c.running;
          const iconSize = both ? 12 : 16;
          return (
            <View key={d} style={styles.dayCol}>
              <Text style={styles.dayName}>{DAY_NAMES[d]}</Text>
              <Pressable onPress={() => tapDay(d)} style={[styles.dayCell, active && styles.dayCellActive]}>
                {both ? (
                  <>
                    <BarbellIcon size={iconSize} color="#000" />
                    <RunIcon size={iconSize} color={colors.blue} />
                  </>
                ) : c.strength ? (
                  <BarbellIcon size={iconSize} color="#000" />
                ) : c.running ? (
                  <RunIcon size={iconSize} color={colors.blue} />
                ) : (
                  <XIcon size={16} color="#48484a" />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      <Stepper
        icon={<BarbellIcon size={16} color={colors.text} />}
        label="Strength days"
        count={sN}
        onInc={() => incDay('strength')}
        onDec={() => decDay('strength')}
      />
      <Stepper
        icon={<RunIcon size={16} color={colors.blue} />}
        label="Running days"
        count={rN}
        onInc={() => incDay('running')}
        onDec={() => decDay('running')}
      />

      <View style={styles.infoBanner}>
        <InfoIcon />
        <Text style={styles.infoText}>
          {total} of 8 sessions used. {msg}
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  modeSeg: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 999, padding: 4, marginBottom: 22 },
  modeBtn: { flex: 1, paddingVertical: 11, borderRadius: 999, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.text },
  modeBtnText: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.textDim },
  modeBtnTextActive: { color: '#000' },
  dayGrid: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dayCol: { flex: 1, alignItems: 'center', gap: 8 },
  dayName: { fontFamily: fonts.bold, fontSize: 11, color: colors.textDimmer },
  dayCell: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  dayCellActive: { backgroundColor: colors.text },
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
  },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textDim, lineHeight: 19 },
});
