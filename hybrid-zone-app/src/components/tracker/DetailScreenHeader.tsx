import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts } from '@/theme/trackerTokens';
import { TrChevLeftIcon, XIcon } from '@/icons';

interface Props {
  title: string;
  onClose?: () => void; // custom close handler; defaults to navigation.goBack()
  variant?: 'back' | 'x';
  right?: React.ReactNode; // replaces the default right-side spacer, e.g. a share button
}

// The icon-btn-round back/close + centered title + spacer row repeated
// across every detail/sub screen (Analytics, Achievements, Run/Strength/
// Other Activity Detail, ...).
//
// The title is positioned absolutely, centered on the row itself, rather than
// just being the middle child of a space-between row — a `right` with two
// icons (e.g. Share + Delete) is wider than the single back button, and a
// space-between layout pushes the title off-true-center to compensate. This
// way it stays centered no matter what's on either side.
export function DetailScreenHeader({ title, onClose, variant = 'back', right }: Props) {
  const navigation = useNavigation();
  const handlePress = onClose ?? (() => navigation.goBack());
  return (
    <View style={styles.row}>
      <Pressable style={styles.iconBtnRound} onPress={handlePress}>
        {variant === 'x' ? <XIcon size={14} color={colors.text} /> : <TrChevLeftIcon size={16} color={colors.text} />}
      </Pressable>
      <View style={styles.titleWrap} pointerEvents="none">
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right ?? <View style={{ width: 34 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, position: 'relative' },
  iconBtnRound: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  // Clears the widest side (two icon buttons + their gap) on both edges, so
  // the title's own centered box is never pushed around by what's beside it.
  titleWrap: { position: 'absolute', left: 90, right: 90, top: 18, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, textAlign: 'center' },
});
