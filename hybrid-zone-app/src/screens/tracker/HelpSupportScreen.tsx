import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, typography } from '@/theme/trackerTokens';
import { TrBellIcon, TrChevLeftIcon } from '@/icons';

const FAQS = [
  { q: 'How do I switch my training split?', a: 'Open the schedule area on Home or Strength and tap "Edit Program" — you can choose a preset split or build your own, then assign which days each session falls on.' },
  { q: 'Can I change units between km/kg and mi/lb?', a: 'Yes — Account > Units of Measure. Everything you log stays consistent no matter which you pick.' },
  { q: 'How are my rings calculated?', a: 'Weekly Goal is your progress on this week\'s planned workouts and runs (plus steps if you\'ve connected Health). Consistency is how many scheduled sessions you did on their scheduled day. Volume Trend compares the weight you lifted this week with last week. Tap any ring label on Home for details.' },
  { q: 'Where do steps, sleep and heart rate come from?', a: 'From Apple Health (iPhone) or Health Connect (Android) once you connect it in Account > Connected Apps & Devices. Until then those tiles show "—".' },
  { q: 'How do I delete a workout or run I logged by mistake?', a: 'Open it from Recent Activity or Activities and tap the trash icon at the top right.' },
  { q: 'Can I export my logged workouts?', a: 'Yes — Account > Data Export shares a CSV of everything you’ve logged.' },
];

export function HelpSupportScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
          <TrChevLeftIcon size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Help & Support</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={[typography.sectionTitle, { marginBottom: 10 }]}>Frequently Asked Questions</Text>
          <View style={{ gap: 8 }}>
            {FAQS.map((f) => (
              <View key={f.q} style={styles.card}>
                <Text style={styles.q}>{f.q}</Text>
                <Text style={styles.a}>{f.a}</Text>
              </View>
            ))}
          </View>
        </View>
        <View>
          <Text style={[typography.sectionTitle, { marginBottom: 10 }]}>Contact Us</Text>
          <View style={styles.settingsList}>
            <Pressable style={styles.settingsRow} onPress={() => Linking.openURL('mailto:aleveatelier@gmail.com?subject=Hyvo%20support')}>
              <TrBellIcon size={17} color={colors.accent200} />
              <Text style={styles.settingsLabel}>aleveatelier@gmail.com</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18 },
  iconBtnRound: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30, gap: 22 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16 },
  q: { fontSize: 13.5, fontFamily: fonts.semiBold, color: colors.text },
  a: { fontSize: 12.5, color: colors.neutral500, marginTop: 6, lineHeight: 18, fontFamily: fonts.regular },
  settingsList: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  settingsLabel: { flex: 1, fontSize: 13.5, color: colors.text, fontFamily: fonts.regular },
});
