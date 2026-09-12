import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, typography } from '@/theme/trackerTokens';
import { XIcon } from '@/icons';
import { AchievementBadge } from '@/components/tracker/AchievementBadge';
import { ACTIVITY_MILESTONES, PERSONAL_RECORDS, FIRSTS } from '@/store/trackerStore';

export function AchievementsHubScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
          <XIcon size={14} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Achievements</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={typography.sectionTitle}>Activity Milestones</Text>
          <Text style={styles.hint}>Tiers earn weight as you climb</Text>
          <View style={styles.grid}>
            {ACTIVITY_MILESTONES.map((m) => (
              <AchievementBadge key={m.id} item={m} shape="hex" size={76} />
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        <View>
          <Text style={typography.sectionTitle}>Personal Records</Text>
          <Text style={styles.hint}>Your fastest time at each distance</Text>
          <View style={styles.grid}>
            {PERSONAL_RECORDS.map((p) => (
              <AchievementBadge key={p.id} item={p} shape="hex" size={76} />
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        <View>
          <Text style={typography.sectionTitle}>Firsts</Text>
          <Text style={styles.hint}>Earned once, dated the day you did it</Text>
          <View style={styles.grid}>
            {FIRSTS.map((f) => (
              <AchievementBadge key={f.id} item={f} shape="disc" size={76} />
            ))}
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
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30, gap: 20 },
  hint: { fontSize: 11, color: colors.neutral500, marginTop: 2, marginBottom: 14, fontFamily: fonts.regular },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, columnGap: 10 },
  divider: { height: 1, backgroundColor: colors.divider },
});
