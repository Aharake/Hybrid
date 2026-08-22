import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/theme/tokens';
import { Level } from '@/engine/schedule';

const LEVELS: { id: Level; label: string; caption: string }[] = [
  { id: 'beginner', label: 'Beginner', caption: 'Under 1 year' },
  { id: 'intermediate', label: 'Intermediate', caption: '1–3 years' },
  { id: 'advanced', label: 'Advanced', caption: '3+ years' },
];

interface Props {
  title: string;
  icon: React.ReactNode;
  value: Level | null;
  onChange: (level: Level) => void;
}

// Matches Onboarding.html's .exp-card / .exp-segs.
export function ExperienceCard({ title, icon, value, onChange }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>{icon}</View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.segs}>
        {LEVELS.map((lvl) => {
          const selected = value === lvl.id;
          return (
            <Pressable
              key={lvl.id}
              onPress={() => onChange(lvl.id)}
              style={[styles.seg, selected && styles.segSelected]}
            >
              <Text style={[styles.segLabel, selected && styles.segLabelSelected]}>{lvl.label}</Text>
              <Text style={[styles.segCaption, selected && styles.segCaptionSelected]}>{lvl.caption}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 32, paddingVertical: 22, paddingHorizontal: 20, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  icon: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 15.5, color: colors.text },
  segs: { flexDirection: 'row', gap: 8 },
  seg: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 18,
    backgroundColor: colors.card2,
  },
  segSelected: { backgroundColor: colors.text },
  segLabel: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.text },
  segLabelSelected: { color: '#000' },
  segCaption: { fontFamily: fonts.regular, fontSize: 10.5, color: colors.textDim, marginTop: 4 },
  segCaptionSelected: { color: '#5a5a5c' },
});
