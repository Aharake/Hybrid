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

// Icon-only nav pill with the add button in the middle: two tabs on its left,
// two on its right.
export function TrackerTabBar({ active }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<TrackerStackParamList>>();
  const openAddSession = useTrackerStore((s) => s.openAddSession);

  const renderItem = (item: (typeof ITEMS)[number]) => (
    <Pressable
      key={item.route}
      style={styles.item}
      onPress={() => {
        // Tapping the tab you're already on shouldn't rebuild it.
        if (item.route !== active) navigation.reset({ index: 0, routes: [{ name: item.route }] });
      }}
    >
      {item.icon(item.route === active)}
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        {ITEMS.slice(0, 2).map(renderItem)}
        <Pressable style={styles.fab} onPress={openAddSession}>
          <TrPlusIcon size={22} color={colors.bg} />
        </Pressable>
        {ITEMS.slice(2).map(renderItem)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: colors.bg },
  pill: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 6 },
  item: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  fab: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
});
