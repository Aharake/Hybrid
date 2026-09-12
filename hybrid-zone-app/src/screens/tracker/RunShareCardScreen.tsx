import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { colors, fonts, radius } from '@/theme/trackerTokens';
import { TrDownloadIcon, TrPlusIcon, TrShareIcon } from '@/icons';
import { RoutePolylineSvg } from '@/components/tracker/RoutePolylineSvg';
import { DetailScreenHeader } from '@/components/tracker/DetailScreenHeader';
import { useTrackerStore } from '@/store/trackerStore';
import { distanceUnitLabel, distanceValueOnly, fmtPaceFromSecPerKm } from '@/engine/units';

export function RunShareCardScreen() {
  const { activities, activeActivityIndex, unitSystem, shareCardStyle, shareCardYPct, runSharePhoto, selectShareCardStyle, setShareCardYPct, setRunSharePhoto } =
    useTrackerStore();
  const a = activeActivityIndex !== null ? activities[activeActivityIndex] : null;
  const [containerHeight, setContainerHeight] = useState(0);
  const [busy, setBusy] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  if (!a || !a.runStats) return <View style={styles.screen} />;
  const rs = a.runStats;
  const avgPaceSecPerKm = (rs.duration * 60) / rs.distance;
  const distStr = distanceValueOnly(rs.distance, unitSystem, 1);
  const distUnit = distanceUnitLabel(unitSystem);
  const paceStr = `${fmtPaceFromSecPerKm(avgPaceSecPerKm, unitSystem)}/${distUnit}`;

  const gesture = Gesture.Pan().onUpdate((e) => {
    if (containerHeight <= 0) return;
    const pct = (e.y / containerHeight) * 100;
    runOnJS(setShareCardYPct)(pct);
  });

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access to add a background image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      setRunSharePhoto(result.assets[0].uri);
    }
  };

  // The OS share sheet itself offers "Save Image" (iOS) / a gallery target
  // (Android), so Save and Share both just open it — no extra
  // expo-media-library dependency needed for a direct camera-roll write.
  const shareCard = async () => {
    setBusy(true);
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error('capture failed');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      } else {
        Alert.alert("Sharing isn't available on this device.");
      }
    } catch {
      Alert.alert("Couldn't create the share card", 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <DetailScreenHeader title="Share Run" variant="x" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.tabs}>
          <Pressable style={[styles.tab, shareCardStyle === 'compact' && styles.tabActive]} onPress={() => selectShareCardStyle('compact')}>
            <Text style={[styles.tabText, shareCardStyle === 'compact' && styles.tabTextActive]}>Card</Text>
          </Pressable>
          <Pressable style={[styles.tab, shareCardStyle === 'stacked' && styles.tabActive]} onPress={() => selectShareCardStyle('stacked')}>
            <Text style={[styles.tabText, shareCardStyle === 'stacked' && styles.tabTextActive]}>Minimal</Text>
          </Pressable>
        </View>

        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }} style={styles.previewWrap}>
          <View style={styles.preview} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
            {runSharePhoto ? (
              <Image source={{ uri: runSharePhoto }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.gradientFallback]} />
            )}
            <GestureDetector gesture={gesture}>
              <View style={[styles.cardHandle, { top: `${shareCardYPct}%` }]}>
                {shareCardStyle === 'compact' ? (
                  <View style={styles.compactCard}>
                    <View style={styles.compactTop}>
                      <Image source={require('../../../assets/logo-mark.png')} style={styles.markSm} resizeMode="contain" />
                      <RoutePolylineSvg route={rs.route ?? []} size={42} color="#fff" />
                    </View>
                    <View style={styles.hr} />
                    <View style={styles.distRow}>
                      <Text style={styles.distValLg}>{distStr}</Text>
                      <Text style={styles.distUnitLg}>{distUnit}</Text>
                    </View>
                    <View style={styles.compactStatsRow}>
                      <View>
                        <Text style={styles.compactStatLbl}>Pace</Text>
                        <Text style={styles.compactStatVal}>{paceStr}</Text>
                      </View>
                      <View>
                        <Text style={styles.compactStatLbl}>Time</Text>
                        <Text style={styles.compactStatVal}>{rs.duration}:00</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.stackedCard}>
                    <Image source={require('../../../assets/logo-mark.png')} style={styles.markSm} resizeMode="contain" />
                    <View style={{ marginTop: 14 }}>
                      <RoutePolylineSvg route={rs.route ?? []} size={72} color="#fff" />
                    </View>
                    <Text style={styles.stackedLbl}>Distance</Text>
                    <Text style={styles.stackedVal}>
                      {distStr} {distUnit}
                    </Text>
                    <View style={styles.stackedHr} />
                    <Text style={styles.stackedLbl}>Pace</Text>
                    <Text style={styles.stackedValSm}>{paceStr}</Text>
                    <View style={styles.stackedHr} />
                    <Text style={styles.stackedLbl}>Time</Text>
                    <Text style={styles.stackedValSm}>{rs.duration}:00</Text>
                  </View>
                )}
              </View>
            </GestureDetector>
          </View>
        </ViewShot>
        <Text style={styles.dragHint}>Drag the card up or down to reposition it</Text>

        <Pressable style={styles.photoBtn} onPress={pickPhoto}>
          <TrPlusIcon size={14} color={colors.text} />
          <Text style={styles.photoBtnText}>{runSharePhoto ? 'Change Photo' : 'Choose Photo from Gallery'}</Text>
        </Pressable>

        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={shareCard} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color={colors.bg} /> : <TrDownloadIcon size={15} color={colors.bg} />}
            <Text style={styles.actionBtnText}>Save</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.actionBtnAlt]} onPress={shareCard} disabled={busy}>
            <TrShareIcon size={15} color={colors.text} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextAlt]}>Share</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30, gap: 16 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.divider },
  tabActive: { backgroundColor: colors.surface },
  tabText: { fontSize: 13, fontFamily: fonts.medium, color: colors.neutral500 },
  tabTextActive: { color: colors.text },
  previewWrap: { width: '100%', aspectRatio: 9 / 16, borderRadius: radius.lg, overflow: 'hidden' },
  preview: { flex: 1, position: 'relative' },
  gradientFallback: { backgroundColor: '#151517' },
  cardHandle: { position: 'absolute', left: '50%', width: '92%', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
  markSm: { width: 20, height: 20, tintColor: '#fff' },
  compactCard: { width: '62%', alignSelf: 'center', backgroundColor: 'rgba(10,10,11,0.55)', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)' },
  compactTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hr: { height: 1, backgroundColor: 'rgba(255,255,255,0.35)', marginVertical: 10 },
  distRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  distValLg: { fontFamily: fonts.bold, fontSize: 26, color: '#fff' },
  distUnitLg: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  compactStatsRow: { flexDirection: 'row', gap: 18, marginTop: 8 },
  compactStatLbl: { fontSize: 8.5, letterSpacing: 0.4, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' },
  compactStatVal: { fontFamily: fonts.semiBold, fontSize: 12.5, color: '#fff', marginTop: 2 },
  stackedCard: { alignItems: 'center' },
  stackedLbl: { fontSize: 9.5, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginTop: 14 },
  stackedVal: { fontFamily: fonts.bold, fontSize: 28, color: '#fff', marginTop: 2 },
  stackedValSm: { fontFamily: fonts.bold, fontSize: 20, color: '#fff', marginTop: 2 },
  stackedHr: { width: 70, height: 1, backgroundColor: 'rgba(255,255,255,0.35)', marginTop: 10 },
  dragHint: { textAlign: 'center', fontSize: 10.5, color: colors.neutral500, marginTop: -8, fontFamily: fonts.regular },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.divider, borderRadius: radius.md, paddingVertical: 13 },
  photoBtnText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.text, borderRadius: 999, paddingVertical: 15 },
  actionBtnAlt: { backgroundColor: colors.surface },
  actionBtnText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.bg },
  actionBtnTextAlt: { color: colors.text },
});
