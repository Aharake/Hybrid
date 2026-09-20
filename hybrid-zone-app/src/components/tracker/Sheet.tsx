import React, { useEffect } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { XIcon } from '@/icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  tall?: boolean;
  zIndex?: number;
  headerExtra?: React.ReactNode; // for headers with more than a plain title (e.g. swap's subtitle)
  children: React.ReactNode;
}

// Matches Tracker (new).html's .sheet-scrim / .sheet — the bottom-sheet chrome
// shared by every overlay/sheet in the new design.
export function Sheet({ visible, onClose, title, tall, zIndex = 30, headerExtra, children }: Props) {
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;
  return (
    // Lifts the sheet with the keyboard (the scrim is absolutely positioned, so
    // nothing else would move it) and shrinks its %-based height to fit above it.
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.scrim, { zIndex }]}>
      <View style={[styles.sheet, tall && styles.sheetTall]}>
        <View style={styles.head}>
          {headerExtra ?? (title ? <Text style={styles.title}>{title}</Text> : <View />)}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <XIcon size={13} color={colors.neutral600} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(19,19,21,0.45)', justifyContent: 'flex-end' },
  sheet: { width: '100%', backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 22, paddingHorizontal: 20, paddingBottom: 24, maxHeight: '88%' },
  sheetTall: { height: '80%' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontFamily: fonts.medium, fontSize: 18, color: colors.text },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  content: { gap: 16, paddingBottom: 8 },
});
