import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/theme/tokens';
import { StarIcon } from '@/icons';

// Matches Onboarding.html's .testi-card (loading screen).
export function TestimonialCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Loved by hybrid athletes</Text>
      <View style={styles.stars}>
        {[0, 1, 2, 3, 4].map((i) => (
          <StarIcon key={i} />
        ))}
      </View>
      <Text style={styles.quote}>
        "Finally a plan that respects both my lifts and my long runs, without me having to reconcile two separate
        apps." — Sarah K.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', backgroundColor: colors.card, borderRadius: 24, padding: 20 },
  title: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.text, marginBottom: 8 },
  stars: { flexDirection: 'row', gap: 2, marginBottom: 10 },
  quote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19.5, color: colors.textDim },
});
