import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { OptionCard } from '@/components/OptionCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors, fonts, radius, typography } from '@/theme/tokens';
import { BarbellIcon, RunIcon } from '@/icons';
import { DAY_NAMES, countDays } from '@/engine/schedule';
import { buildWeekPreview } from '@/engine/planPreview';
import { getRecommendation } from '@/engine/split';
import type { OnboardingStackParamList } from '@/navigation/types';

const FOCUS_WORD: Record<string, string> = { upper: 'upper', balanced: 'balanced', lower: 'lower' };

export function SplitScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Split'>>();
  const { schedule, equipment, focus, split, runningGoal, setField, selectCustomSplit } = useOnboardingStore();

  const sN = countDays(schedule, 'strength');
  const isBodyweight = equipment === 'bodyweight';
  const bodyweightRec = sN <= 2 ? 'full_body' : 'upper_lower';
  const rec = getRecommendation(sN, focus);

  useEffect(() => {
    if (isBodyweight) {
      if (!split || split === 'custom' || split === 'ppl') setField('split', bodyweightRec);
    } else if (!split) {
      if (rec.preset) setField('split', rec.preset);
      else selectCustomSplit(rec.label!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBodyweight, sN, focus]);

  const week = buildWeekPreview({ schedule, split: split || 'full_body', focus, runningGoal });
  const dayWord = `${sN} strength day${sN === 1 ? '' : 's'}`;

  return (
    <OnboardingScreen progress={92} footer={<PrimaryButton label="Continue" onPress={() => navigation.navigate('Summary')} />}>
      <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>Training Split</Text>

      {isBodyweight ? (
        <>
          <Text style={[typography.subtitle, { marginBottom: 26 }]}>
            You picked {dayWord}/week. Bodyweight training works best kept to two formats — here's what fits.
          </Text>
          <OptionCard
            label="Full body"
            desc="Train your whole body each session for higher training frequency"
            selected={split === 'full_body'}
            recommended={bodyweightRec === 'full_body'}
            onPress={() => setField('split', 'full_body')}
          />
          <OptionCard
            label="Upper / Lower"
            desc="Alternate upper and lower body sessions across the week"
            selected={split === 'upper_lower'}
            recommended={bodyweightRec === 'upper_lower'}
            onPress={() => setField('split', 'upper_lower')}
          />
        </>
      ) : (
        <>
          <Text style={[typography.subtitle, { marginBottom: 26 }]}>
            You picked {dayWord}/week — here's what fits best. (You can still pick a different one.)
          </Text>
          {!rec.preset && (
            <>
              <Pressable
                onPress={() => selectCustomSplit(rec.label!)}
                style={[styles.customCard, split === 'custom' && styles.customCardSelected]}
              >
                <View style={styles.customBadge}>
                  <Text style={styles.customBadgeText}>Recommended</Text>
                </View>
                <Text style={[styles.customLabel, split === 'custom' && styles.customLabelSelected]}>{rec.label}</Text>
                <Text style={[styles.customDesc, split === 'custom' && styles.customDescSelected]}>
                  Built around your {dayWord} and {FOCUS_WORD[rec.bucket]} focus
                </Text>
              </Pressable>
              <Text style={[typography.sectionLabel, { marginTop: 22, marginBottom: 12 }]}>OR CHOOSE A STANDARD SPLIT</Text>
            </>
          )}
          <OptionCard
            label="Full body"
            desc="Train your whole body each session for higher training frequency"
            selected={split === 'full_body'}
            recommended={rec.preset === 'full_body'}
            onPress={() => setField('split', 'full_body')}
          />
          <OptionCard
            label="Upper / Lower"
            desc="Alternate upper and lower body sessions across the week"
            selected={split === 'upper_lower'}
            recommended={rec.preset === 'upper_lower'}
            onPress={() => setField('split', 'upper_lower')}
          />
          <OptionCard
            label="Push / Pull / Legs"
            desc="Dedicated push, pull, and leg days for focused volume"
            selected={split === 'ppl'}
            recommended={rec.preset === 'ppl'}
            onPress={() => setField('split', 'ppl')}
          />
        </>
      )}

      <Text style={[typography.sectionLabel, { marginTop: 26, marginBottom: 12 }]}>YOUR SUGGESTED WEEK</Text>
      <View style={styles.weekCard}>
        {week.map((d, i) => (
          <View key={d.day} style={[styles.weekRow, i < week.length - 1 && styles.weekRowBorder]}>
            <Text style={styles.weekDay}>{DAY_NAMES[d.day]}</Text>
            {d.strength || d.running ? (
              <View style={styles.weekChips}>
                {d.strength && (
                  <View style={styles.weekChip}>
                    <BarbellIcon size={13} color={colors.text} />
                    <Text style={styles.weekChipText}>{d.strength}</Text>
                  </View>
                )}
                {d.running && (
                  <View style={styles.weekChip}>
                    <RunIcon size={13} color={colors.blue} />
                    <Text style={styles.weekChipText}>{d.running}</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.weekRest}>Rest</Text>
            )}
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  customCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 22, marginBottom: 14 },
  customCardSelected: { backgroundColor: colors.text },
  customBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  customBadgeText: { fontFamily: fonts.extraBold, fontSize: 11, color: colors.greenText },
  customLabel: { fontFamily: fonts.bold, fontSize: 19, color: colors.text },
  customLabelSelected: { color: '#000' },
  customDesc: { fontFamily: fonts.regular, fontSize: 13.5, color: colors.textDim, marginTop: 6 },
  customDescSelected: { color: '#48484a' },
  weekCard: { backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 18, paddingVertical: 4 },
  weekRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 },
  weekRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.track },
  weekDay: { width: 34, fontFamily: fonts.bold, fontSize: 12.5, color: colors.textDim },
  weekChips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weekChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card2, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 },
  weekChipText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text },
  weekRest: { fontFamily: fonts.regular, fontSize: 13, color: colors.textDimmer },
});
