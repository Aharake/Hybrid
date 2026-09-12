import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, typography } from '@/theme/trackerTokens';
import { TrChartIcon, TrChevLeftIcon } from '@/icons';
import { useTrackerStore, SessionExercise } from '@/store/trackerStore';
import type { TrackerStackParamList } from '@/navigation/trackerTypes';

// Reached from Strength's "Analytics" link — search across every exercise
// (used ones first, then the rest of the pool) and jump into its detail/
// history graph, independent of which session it's scheduled in.
export function AnalyticsHubScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<TrackerStackParamList>>();
  const { analyticsSearch, setAnalyticsSearch, getAllUsedExercises, getAllPoolExercises, viewExerciseAnalytics } = useTrackerStore();

  const query = analyticsSearch.trim().toLowerCase();
  const used = getAllUsedExercises().filter((e) => !query || e.name.toLowerCase().includes(query));
  const pool = getAllPoolExercises().filter((e) => !query || e.name.toLowerCase().includes(query));

  const openExercise = (ex: SessionExercise) => {
    viewExerciseAnalytics(ex.id);
    navigation.navigate('ExerciseDetail');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
          <TrChevLeftIcon size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Analytics</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.search}
          placeholder="Search exercises…"
          placeholderTextColor={colors.neutral500}
          value={analyticsSearch}
          onChangeText={setAnalyticsSearch}
        />

        {used.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={[typography.sectionTitle, { marginTop: 4 }]}>Your Exercises</Text>
            <View style={{ gap: 8 }}>
              {used.map((ex) => (
                <Pressable key={ex.id} style={styles.row} onPress={() => openExercise(ex)}>
                  <Text style={styles.rowLabel}>{ex.name}</Text>
                  <Text style={styles.rowGroup}>{ex.group}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {pool.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={typography.sectionTitle}>All Exercises</Text>
            <View style={{ gap: 8 }}>
              {pool.map((ex) => (
                <Pressable key={ex.id} style={styles.row} onPress={() => openExercise(ex)}>
                  <Text style={styles.rowLabel}>{ex.name}</Text>
                  <Text style={styles.rowGroup}>{ex.group}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {used.length === 0 && pool.length === 0 && (
          <View style={styles.empty}>
            <TrChartIcon size={26} color={colors.neutral500} />
            <Text style={styles.emptyText}>No exercises match "{analyticsSearch}".</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18 },
  iconBtnRound: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  scroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24, gap: 20 },
  search: { backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14, color: colors.text, fontFamily: fonts.regular },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16 },
  rowLabel: { fontSize: 14.5, color: colors.text, fontFamily: fonts.medium },
  rowGroup: { fontSize: 11, color: colors.neutral500, fontFamily: fonts.regular },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
  emptyText: { fontSize: 13, color: colors.neutral500, textAlign: 'center', fontFamily: fonts.regular },
});
