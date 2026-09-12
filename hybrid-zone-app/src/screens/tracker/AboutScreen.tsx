import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrChevLeftIcon, TrChevRightIcon } from '@/icons';
import { API_BASE_URL } from '@/api/client';

const LINKS: { label: string; url: string | null }[] = [
  { label: 'Terms of Service', url: `${API_BASE_URL}/terms` },
  { label: 'Privacy Policy', url: `${API_BASE_URL}/privacy` },
  { label: 'Licenses', url: null },
];

export function AboutScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable style={styles.iconBtnRound} onPress={() => navigation.goBack()}>
          <TrChevLeftIcon size={16} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle}>About</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <Image source={require('../../../assets/logo-mark.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.appName}>Hyvo</Text>
        <Text style={styles.tagline}>Strength Meets Endurance</Text>
        <Text style={styles.version}>Version 1.0.0 (Prototype)</Text>
        <View style={styles.settingsList}>
          {LINKS.map(({ label, url }, i) => (
            <Pressable
              key={label}
              style={[styles.row, i !== LINKS.length - 1 && styles.rowBorder]}
              disabled={!url}
              onPress={() => url && Linking.openURL(url)}
            >
              <Text style={styles.rowLabel}>{label}</Text>
              <TrChevRightIcon size={14} color={colors.text} />
            </Pressable>
          ))}
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
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30, alignItems: 'center' },
  logoWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  logo: { width: 30, height: 30 },
  appName: { fontFamily: fonts.semiBold, fontSize: 20, color: colors.text, marginTop: 14 },
  tagline: { fontSize: 12.5, color: colors.neutral500, marginTop: 2, fontFamily: fonts.regular },
  version: { fontSize: 11.5, color: colors.neutral500, marginTop: 16, fontFamily: fonts.regular },
  settingsList: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', marginTop: 20 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowLabel: { fontSize: 13.5, color: colors.text, fontFamily: fonts.regular },
});
