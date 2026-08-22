import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '@/theme/tokens';
import { BackIcon } from '@/icons';

interface Props {
  progress: number; // 0-100
  canGoBack: boolean;
  onBack: () => void;
}

// Matches Onboarding.html's .qheader / .back-btn / .progress-track / .progress-fill.
export function OnboardingHeader({ progress, canGoBack, onBack }: Props) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        disabled={!canGoBack}
        style={[styles.backBtn, !canGoBack && styles.backBtnHidden]}
      >
        <BackIcon />
      </Pressable>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 4,
  },
  backBtn: {
    width: 42,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnHidden: { opacity: 0 },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: colors.track,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.text,
    borderRadius: radius.full,
  },
});
