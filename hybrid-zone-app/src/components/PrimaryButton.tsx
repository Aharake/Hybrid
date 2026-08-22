import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, fonts, radius } from '@/theme/tokens';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
  color?: 'white' | 'green' | 'blue';
  style?: StyleProp<ViewStyle>;
}

const COLOR_MAP: Record<NonNullable<Props['color']>, { bg: string; text: string }> = {
  white: { bg: colors.text, text: '#000' },
  green: { bg: colors.green, text: '#04220c' },
  blue: { bg: colors.blue, text: '#fff' },
};

// Matches Onboarding.html's .btn-primary / .btn-ghost and Tracker.html's .btn-primary
// (green by default there) / .btn-primary.blue.
export function PrimaryButton({ label, onPress, disabled, variant = 'primary', color = 'white', style }: Props) {
  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [styles.ghost, pressed && styles.ghostPressed, style]}
      >
        <Text style={styles.ghostLabel}>{label}</Text>
      </Pressable>
    );
  }

  const tone = COLOR_MAP[color];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: tone.bg },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, { color: tone.text }, disabled && styles.disabledLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.98 }] },
  disabled: { backgroundColor: colors.disabledBg },
  label: { fontSize: 17, fontFamily: fonts.bold, letterSpacing: -0.2 },
  disabledLabel: { color: colors.disabledText },
  ghost: {
    width: '100%',
    paddingVertical: 15,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  ghostPressed: { opacity: 0.6 },
  ghostLabel: { color: colors.textDim, fontSize: 15, fontFamily: fonts.semiBold },
});
