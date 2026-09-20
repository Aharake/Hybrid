import React from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '@/theme/trackerTokens';
import { TrTrashIcon } from '@/icons';
import { useTrackerStore } from '@/store/trackerStore';

// Header button on an activity's detail screen: removes a mistaken log from the
// account (and from every stat and record derived from it).
export function DeleteActivityButton() {
  const navigation = useNavigation();
  const index = useTrackerStore((s) => s.activeActivityIndex);
  const deleteActivity = useTrackerStore((s) => s.deleteActivity);

  const confirm = () => {
    if (index === null) return;
    Alert.alert('Delete this activity?', "It'll be removed from your history and stats. This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteActivity(index);
          if (ok) navigation.goBack();
          else Alert.alert("Couldn't delete it", 'Check your connection and try again.');
        },
      },
    ]);
  };

  return (
    <Pressable style={styles.btn} onPress={confirm} hitSlop={6}>
      <TrTrashIcon size={15} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
