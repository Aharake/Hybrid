import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrChevRightIcon } from '@/icons';

interface Props {
  kicker: string;
  title: string;
  sub: string;
  ctaLabel?: string;
  onPressCta?: () => void;
  restVariant?: boolean; // rest-day styling: surface bg + normal text color, instead of inverted
}

// Matches Tracker (new).html's .hero-card (Home's strength/running/rest-day cards).
export function HeroCard({ kicker, title, sub, ctaLabel, onPressCta, restVariant }: Props) {
  const fg = restVariant ? colors.text : colors.bg;
  return (
    <View style={[styles.card, { backgroundColor: restVariant ? colors.surface : colors.text }]}>
      <Text style={[styles.kicker, { color: fg }]}>{kicker}</Text>
      <Text style={[styles.title, { color: fg }]}>{title}</Text>
      <Text style={[styles.sub, { color: fg }]}>{sub}</Text>
      {!!ctaLabel && (
        <Pressable style={styles.btn} onPress={onPressCta}>
          <Text style={styles.btnText}>{ctaLabel}</Text>
          <TrChevRightIcon size={12} color={colors.text} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, paddingVertical: 13, paddingHorizontal: 15 },
  kicker: { fontSize: 9.5, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.55, marginBottom: 4, fontFamily: fonts.regular },
  title: { fontFamily: fonts.medium, fontSize: 15 },
  sub: { fontSize: 10.5, opacity: 0.65, marginTop: 2, fontFamily: fonts.regular },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.bg, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, marginTop: 10, alignSelf: 'flex-start' },
  btnText: { fontFamily: fonts.medium, fontSize: 11.5, color: colors.text },
});
