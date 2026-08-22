import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '@/theme/trackerTokens';
import { TrAccountIcon, TrHomeIcon, TrPlusIcon, TrRunningIcon, TrStrengthIcon } from '@/icons';
import { useTrackerStore } from '@/store/trackerStore';
import type { TabRouteName, TrackerStackParamList } from '@/navigation/trackerTypes';

const ITEMS: { route: TabRouteName; icon: (active: boolean) => React.ReactNode }[] = [
  { route: 'HomeTab', icon: (a) => <TrHomeIcon color={a ? colors.secondary : colors.neutral500} /> },
  { route: 'StrengthTab', icon: (a) => <TrStrengthIcon color={a ? colors.secondary : colors.neutral500} /> },
  { route: 'RunningTab', icon: (a) => <TrRunningIcon color={a ? colors.secondary : colors.neutral500} /> },
  { route: 'AccountTab', icon: (a) => <TrAccountIcon color={a ? colors.secondary : colors.neutral500} /> },
];

interface Props {
  active: TabRouteName;
}

// Matches Tracker (new).html's navBar() — icon-only nav pill (no text labels,
// despite the source's vestigial .navitem span CSS rule) + an integrated FAB
// that opens the new-session sheet.
export function TrackerTabBar({ active }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<TrackerStackParamList>>();
  const openAddSession = useTrackerStore((s) => s.openAddSession);

  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        {ITEMS.map((item) => (
          <Pressable
            key={item.route}
            style={styles.item}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: item.route }] })}
          >
            {item.icon(item.route === active)}
          </Pressable>
        ))}
      </View>
      <Pressable style={styles.fab} onPress={openAddSession}>
        <TrPlusIcon size={20} color={colors.bg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: colors.bg },
  pill: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 4 },
  item: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  fab: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
});
