import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, typography } from '@/theme/trackerTokens';
import { TrChevLeftIcon, TrDevicesIcon } from '@/icons';

// Health app / wearable sync (Apple Health, Google Health Connect) isn't
// built yet — this is an honest empty state rather than a fake toggle list,
// so it can grow into a real integrations screen later without surprising
// anyone who thought a connection here was doing something.
export function ConnectedAppsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
          <TrChevLeftIcon size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>Connected Apps & Devices</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.empty}>
          <TrDevicesIcon size={26} color={colors.neutral500} />
          <Text style={[typography.sectionTitle, { marginTop: 12, textAlign: 'center' }]}>No connected apps yet</Text>
          <Text style={styles.emptyText}>
            Support for Apple Health, Google Health Connect, and wearables isn't available yet. Hyvo tracks your runs and
            workouts directly, no connection needed.
          </Text>
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
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 60, paddingHorizontal: 10 },
  emptyText: { fontSize: 13, color: colors.neutral500, textAlign: 'center', lineHeight: 19, fontFamily: fonts.regular, marginTop: 2 },
});
