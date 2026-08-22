import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/tokens';
import { MinusIcon, PlusIcon } from '@/icons';

interface Props {
  icon?: React.ReactNode;
  label: string;
  count: number;
  min?: number;
  max?: number;
  onInc: () => void;
  onDec: () => void;
  variant?: 'card' | 'pill'; // card = Onboarding.html's .stepper, pill = Tracker.html's .stepper-row
}

export function Stepper({ icon, label, count, min = 0, max = 6, onInc, onDec, variant = 'card' }: Props) {
  const atMin = count <= min;
  const atMax = count >= max;
  const btnSize = variant === 'card' ? 32 : 30;

  return (
    <View style={[styles.wrap, variant === 'card' ? styles.wrapCard : styles.wrapPill]}>
      <View style={styles.left}>
        {icon && <View style={styles.iconBadge}>{icon}</View>}
        <Text style={variant === 'card' ? styles.labelCard : styles.labelPill}>{label}</Text>
      </View>
      <View style={styles.ctrls}>
        <Pressable
          onPress={onDec}
          disabled={atMin}
          style={[styles.stepBtn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, atMin && styles.stepBtnDisabled]}
        >
          <MinusIcon size={variant === 'card' ? 18 : 14} />
        </Pressable>
        <Text style={styles.num}>{count}</Text>
        <Pressable
          onPress={onInc}
          disabled={atMax}
          style={[styles.stepBtn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, atMax && styles.stepBtnDisabled]}
        >
          <PlusIcon size={variant === 'card' ? 18 : 14} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
  },
  wrapCard: { borderRadius: radius.lg, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 12 },
  wrapPill: { borderRadius: radius.full, paddingVertical: 14, paddingHorizontal: 20, marginTop: 16 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBadge: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  labelCard: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.text },
  labelPill: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  ctrls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: { backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled: { opacity: 0.3 },
  num: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.text, minWidth: 14, textAlign: 'center' },
});
