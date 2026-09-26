import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors, fonts } from '@/theme/trackerTokens';
import { TrBurnIcon, TrCheckIcon, TrClockIcon, TrHeartrateIcon, TrPaceIcon, TrPlusIcon, TrShareIcon, TrStepsIcon } from '@/icons';
import { RoutePolylineSvg } from './RoutePolylineSvg';
import { useTrackerStore } from '@/store/trackerStore';
import { useHealthStore } from '@/store/healthStore';
import { healthSourceName, readWorkoutHealthStats, WorkoutHealthStats } from '@/engine/health';
import { normalizeRouteToUnitSquare, type RoutePoint } from '@/engine/gps';
import type { WorkoutSummaryData } from '@/engine/records';
import { distanceUnitLabel, distanceValueOnly, fmtPaceFromSecPerKm, fmtWeightAuto, UnitSystem, weightUnitLabel, weightValueAuto } from '@/engine/units';

const GREEN = '#39ff88';
const RUN_BLUE = '#4da3ff';

interface Item {
  label: string;
  value: string;
  unit?: string;
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function fmtWhen(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

// Everything the summary and the share designs show, in one place. `tiles`
// keeps a dash for anything with no reading; `known` drops those, so a share
// card never advertises a number we don't have.
function buildStats(summary: WorkoutSummaryData, health: WorkoutHealthStats | null, unitSystem: UnitSystem) {
  const isRun = summary.kind === 'run' && summary.distanceKm !== null;
  const km = summary.distanceKm ?? 0;
  const primary: Item = isRun
    ? { label: 'Distance', value: distanceValueOnly(km, unitSystem, 2), unit: distanceUnitLabel(unitSystem) }
    : { label: 'Volume lifted', value: weightValueAuto(summary.volumeKg, unitSystem), unit: weightUnitLabel(unitSystem) };

  const calories =
    health?.activeCalories != null ? String(health.activeCalories) : summary.estCalories != null ? `~${summary.estCalories}` : '—';
  const tiles: Item[] = [{ label: 'Time', value: fmtDuration(summary.durationSec) }];
  if (isRun) {
    tiles.push({
      label: 'Avg pace',
      value: km > 0.02 ? fmtPaceFromSecPerKm(summary.durationSec / km, unitSystem) : '—',
      unit: `/${distanceUnitLabel(unitSystem)}`,
    });
  } else {
    tiles.push({ label: 'Sets', value: String(summary.sets) });
    tiles.push({ label: 'Exercises', value: String(summary.exercises) });
  }
  tiles.push({ label: 'Calories', value: calories, unit: calories === '—' ? undefined : 'kcal' });
  tiles.push({ label: 'Steps', value: health?.steps != null ? health.steps.toLocaleString() : '—' });
  tiles.push({ label: 'Avg heart rate', value: health?.avgHeartRate != null ? String(health.avgHeartRate) : '—', unit: health?.avgHeartRate != null ? 'bpm' : undefined });
  tiles.push({ label: 'Max heart rate', value: health?.maxHeartRate != null ? String(health.maxHeartRate) : '—', unit: health?.maxHeartRate != null ? 'bpm' : undefined });
  return { primary, tiles, known: tiles.filter((t) => t.value !== '—') };
}

function tileIcon(label: string) {
  const c = colors.neutral500;
  if (label === 'Time') return <TrClockIcon size={14} color={c} />;
  if (label === 'Avg pace') return <TrPaceIcon size={14} color={c} />;
  if (label === 'Calories') return <TrBurnIcon size={14} color={c} />;
  if (label === 'Steps') return <TrStepsIcon size={14} color={c} />;
  if (label.includes('heart')) return <TrHeartrateIcon size={14} color={c} />;
  return null;
}

/* ---------------- drawings ---------------- */

// Heart-rate (or any) series as a smooth-ish line scaled into w × h.
function seriesPath(values: number[], w: number, h: number, pad = 4): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const step = (w - pad * 2) / Math.max(1, values.length - 1);
  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(pad + i * step).toFixed(1)},${(pad + (1 - (v - min) / range) * (h - pad * 2)).toFixed(1)}`)
    .join(' ');
}

function routePath(route: RoutePoint[], size: number, pad = 6): string {
  const pts = normalizeRouteToUnitSquare(route);
  const inner = size - pad * 2;
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${(pad + p.x * inner).toFixed(1)},${(pad + p.y * inner).toFixed(1)}`).join(' ');
}

// The route if there is one, otherwise the heart-rate curve, drawn with an
// optional glow. Renders nothing when there is neither.
function Visual({ summary, health, w, h, color, glow }: { summary: WorkoutSummaryData; health: WorkoutHealthStats | null; w: number; h: number; color: string; glow?: boolean }) {
  const hasRoute = !!summary.route && summary.route.length >= 2;
  const hr = health?.heartRate ?? null;
  if (!hasRoute && !hr) return null;
  const size = Math.min(w, h);
  const d = hasRoute ? routePath(summary.route!, size) : seriesPath(hr!, w, h);
  const width = hasRoute ? size : w;
  const height = hasRoute ? size : h;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      {glow && <Path d={d} stroke={color} strokeOpacity={0.14} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />}
      {glow && <Path d={d} stroke={color} strokeOpacity={0.3} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />}
      <Path d={d} stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ---------------- share designs ---------------- */

type Design = 'poster' | 'grid' | 'neon' | 'photo';
const DESIGNS: [Design, string][] = [
  ['poster', 'Poster'],
  ['grid', 'Stats'],
  ['neon', 'Neon'],
  ['photo', 'Photo'],
];

interface CanvasProps {
  design: Design;
  w: number;
  summary: WorkoutSummaryData;
  health: WorkoutHealthStats | null;
  primary: Item;
  known: Item[];
  photoUri: string | null;
}

function Brand({ u, color = '#fff' }: { u: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * u }}>
      <Image source={require('../../../assets/logo-mark.png')} style={{ width: 20 * u, height: 20 * u, tintColor: color }} resizeMode="contain" />
      <Text style={{ fontFamily: fonts.bold, fontSize: 13 * u, letterSpacing: 2 * u, color }}>HYVO</Text>
    </View>
  );
}

function StatRow({ items, u, color = '#fff', dim = 'rgba(255,255,255,0.6)' }: { items: Item[]; u: number; color?: string; dim?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 22 * u }}>
      {items.map((it) => (
        <View key={it.label}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 9.5 * u, letterSpacing: 0.8 * u, color: dim, textTransform: 'uppercase' }}>{it.label}</Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: 19 * u, color, marginTop: 3 * u }}>
            {it.value}
            {it.unit ? <Text style={{ fontFamily: fonts.medium, fontSize: 11 * u, color: dim }}> {it.unit}</Text> : null}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ShareCanvas({ design, w, summary, health, primary, known, photoUri }: CanvasProps) {
  const u = w / 360;
  const h = (w * 16) / 9;
  const isRun = summary.kind === 'run';
  const pad = 26 * u;
  const secondary = known.filter((k) => k.label !== primary.label);

  if (design === 'poster') {
    const [c1, c2] = isRun ? ['#1553b8', '#6a2cd8'] : ['#f2994a', '#c2185b'];
    return (
      <View style={{ width: w, height: h, overflow: 'hidden', padding: pad, justifyContent: 'space-between' }}>
        <Svg style={StyleSheet.absoluteFill} width={w} height={h}>
          <Defs>
            <LinearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={c1} />
              <Stop offset="1" stopColor={c2} />
            </LinearGradient>
          </Defs>
          <Rect width={w} height={h} fill="url(#pg)" />
          <Circle cx={w * 0.92} cy={h * 0.1} r={w * 0.55} fill="#fff" fillOpacity={0.07} />
          <Circle cx={w * 0.05} cy={h * 0.86} r={w * 0.42} fill="#000" fillOpacity={0.12} />
        </Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Brand u={u} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 11 * u, color: 'rgba(255,255,255,0.8)' }}>{fmtWhen(summary.endedAt)}</Text>
        </View>
        <View>
          <Text style={{ fontFamily: fonts.semiBold, fontSize: 13 * u, letterSpacing: 1.5 * u, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' }}>{summary.title}</Text>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 104 * u, lineHeight: 112 * u, color: '#fff', letterSpacing: -3 * u, marginTop: 6 * u }} numberOfLines={1} adjustsFontSizeToFit>
            {primary.value}
          </Text>
          <Text style={{ fontFamily: fonts.semiBold, fontSize: 22 * u, color: 'rgba(255,255,255,0.9)' }}>{primary.unit}</Text>
        </View>
        <StatRow items={secondary.slice(0, 3)} u={u} />
      </View>
    );
  }

  if (design === 'grid') {
    const tiles = secondary.slice(0, 4);
    return (
      <View style={{ width: w, height: h, backgroundColor: '#0a0a0b', padding: pad, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Brand u={u} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 11 * u, color: 'rgba(255,255,255,0.55)' }}>{fmtWhen(summary.endedAt)}</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 14 * u }}>
          <Visual summary={summary} health={health} w={w - pad * 2} h={170 * u} color="#fff" />
        </View>
        <View>
          <Text style={{ fontFamily: fonts.medium, fontSize: 11 * u, letterSpacing: 1.2 * u, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>{primary.label}</Text>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 60 * u, color: '#fff', letterSpacing: -1.5 * u }}>
            {primary.value}
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 20 * u, color: 'rgba(255,255,255,0.65)' }}> {primary.unit}</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 * u }}>
          {tiles.map((t) => (
            <View key={t.label} style={{ width: (w - pad * 2 - 10 * u) / 2, borderRadius: 16 * u, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', padding: 14 * u }}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 9.5 * u, letterSpacing: 0.8 * u, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>{t.label}</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 22 * u, color: '#fff', marginTop: 4 * u }}>
                {t.value}
                {t.unit ? <Text style={{ fontFamily: fonts.medium, fontSize: 11 * u, color: 'rgba(255,255,255,0.6)' }}> {t.unit}</Text> : null}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (design === 'neon') {
    return (
      <View style={{ width: w, height: h, backgroundColor: '#050807', padding: pad, justifyContent: 'space-between', overflow: 'hidden' }}>
        <Svg style={StyleSheet.absoluteFill} width={w} height={h}>
          <Defs>
            <RadialGradient id="ng" cx="50%" cy="42%" r="55%">
              <Stop offset="0" stopColor={GREEN} stopOpacity={0.28} />
              <Stop offset="1" stopColor={GREEN} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={w} height={h} fill="url(#ng)" />
        </Svg>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Brand u={u} color={GREEN} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 11 * u, color: 'rgba(57,255,136,0.7)' }}>{summary.title}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Visual summary={summary} health={health} w={w - pad * 2} h={210 * u} color={GREEN} glow />
        </View>
        <View>
          <Text style={{ fontFamily: fonts.extraBold, fontSize: 76 * u, color: GREEN, letterSpacing: -2 * u }} numberOfLines={1} adjustsFontSizeToFit>
            {primary.value}
            <Text style={{ fontFamily: fonts.semiBold, fontSize: 22 * u }}> {primary.unit}</Text>
          </Text>
          <View style={{ marginTop: 14 * u }}>
            <StatRow items={secondary.slice(0, 3)} u={u} color="#eafff2" dim="rgba(57,255,136,0.6)" />
          </View>
        </View>
      </View>
    );
  }

  // photo: your own picture behind the numbers
  return (
    <View style={{ width: w, height: h, backgroundColor: '#151517', overflow: 'hidden', justifyContent: 'space-between', padding: pad }}>
      {photoUri ? <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      <Svg style={StyleSheet.absoluteFill} width={w} height={h}>
        <Defs>
          <LinearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity={0.35} />
            <Stop offset="0.45" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.88} />
          </LinearGradient>
        </Defs>
        <Rect width={w} height={h} fill="url(#sg)" />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Brand u={u} />
        <Text style={{ fontFamily: fonts.medium, fontSize: 11 * u, color: 'rgba(255,255,255,0.85)' }}>{fmtWhen(summary.endedAt)}</Text>
      </View>
      <View>
        <Text style={{ fontFamily: fonts.semiBold, fontSize: 12 * u, letterSpacing: 1.4 * u, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' }}>{summary.title}</Text>
        <Text style={{ fontFamily: fonts.extraBold, fontSize: 84 * u, color: '#fff', letterSpacing: -2.5 * u, marginTop: 2 * u }} numberOfLines={1} adjustsFontSizeToFit>
          {primary.value}
          <Text style={{ fontFamily: fonts.semiBold, fontSize: 22 * u }}> {primary.unit}</Text>
        </Text>
        <View style={{ marginTop: 16 * u }}>
          <StatRow items={secondary.slice(0, 3)} u={u} />
        </View>
      </View>
    </View>
  );
}

/* ---------------- the screen ---------------- */

function SummaryBody({ summary }: { summary: WorkoutSummaryData }) {
  const insets = useSafeAreaInsets();
  const unitSystem = useTrackerStore((s) => s.unitSystem);
  const close = useTrackerStore((s) => s.closeWorkoutSummary);
  const startInShare = useTrackerStore((s) => s.summaryStartInShare);
  const { supported, connected, connect } = useHealthStore();

  const [health, setHealth] = useState<WorkoutHealthStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'summary' | 'share'>(startInShare ? 'share' : 'summary');
  const [design, setDesign] = useState<Design>('poster');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [previewW, setPreviewW] = useState(0);
  const [busy, setBusy] = useState(false);
  const shotRef = useRef<ViewShot>(null);

  const { primary, tiles, known } = buildStats(summary, health, unitSystem);

  const load = useCallback(async () => {
    if (!useHealthStore.getState().connected) return;
    setLoading(true);
    try {
      setHealth(await readWorkoutHealthStats(summary.startedAt, summary.endedAt));
    } catch {
      // leave whatever we had — the tiles just keep their dashes
    } finally {
      setLoading(false);
    }
  }, [summary.startedAt, summary.endedAt]);

  // Read once now, and again shortly after: a watch often hands its data to the
  // phone a few seconds after the workout ends.
  useEffect(() => {
    if (!connected) return;
    load();
    const t = setTimeout(load, 12000);
    return () => clearTimeout(t);
  }, [connected, load]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mode === 'share') setMode('summary');
      else close();
      return true;
    });
    return () => sub.remove();
  }, [mode, close]);

  const handleConnect = async () => {
    const ok = await connect();
    if (ok) load();
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access to add a background image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setDesign('photo');
    }
  };

  // The OS share sheet has "Save Image" on iOS and a gallery target on Android.
  const share = async () => {
    setBusy(true);
    try {
      const uri = await shotRef.current?.capture?.();
      if (!uri) throw new Error('capture failed');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
      else Alert.alert("Sharing isn't available on this device.");
    } catch {
      Alert.alert("Couldn't create the image", 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const isRun = summary.kind === 'run';
  const accent = isRun ? RUN_BLUE : colors.strength;

  /* ---- share mode ---- */
  if (mode === 'share') {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.shareTop}>
          <Pressable style={styles.roundBtn} onPress={() => setMode('summary')}>
            <Text style={styles.roundBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.shareTitle}>Share your workout</Text>
          <View style={{ width: 34 }} />
        </View>
        <ScrollView contentContainerStyle={styles.shareScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.designRow}>
            {DESIGNS.map(([id, label]) => (
              <Pressable key={id} style={[styles.designChip, design === id && styles.designChipActive]} onPress={() => setDesign(id)}>
                <Text style={[styles.designChipText, design === id && styles.designChipTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.previewFrame} onLayout={(e) => setPreviewW(e.nativeEvent.layout.width)}>
            {previewW > 0 && (
              <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
                <ShareCanvas design={design} w={previewW} summary={summary} health={health} primary={primary} known={known} photoUri={photoUri} />
              </ViewShot>
            )}
          </View>
          <Pressable style={styles.photoBtn} onPress={pickPhoto}>
            <TrPlusIcon size={14} color={colors.text} />
            <Text style={styles.photoBtnText}>{photoUri ? 'Change background photo' : 'Add your own photo'}</Text>
          </Pressable>
        </ScrollView>
        <View style={styles.footer}>
          <Pressable style={styles.primaryBtn} onPress={share} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color={colors.bg} /> : <TrShareIcon size={16} color={colors.bg} />}
            <Text style={styles.primaryBtnText}>Share or save</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /* ---- summary mode ---- */
  const hr = health?.heartRate ?? null;
  const renderTile = (t: Item) => (
    <View key={t.label} style={styles.tile}>
      <View style={styles.tileHead}>
        {tileIcon(t.label)}
        <Text style={styles.tileLbl}>{t.label.toUpperCase()}</Text>
      </View>
      <Text style={[styles.tileVal, t.value === '—' && { color: colors.neutral400 }]}>
        {t.value}
        {t.unit ? <Text style={styles.tileUnit}> {t.unit}</Text> : null}
      </Text>
    </View>
  );
  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.doneBadge}>
          <TrCheckIcon size={20} color={colors.bg} />
        </View>
        <Text style={styles.kicker}>WORKOUT COMPLETE</Text>
        <Text style={styles.title}>{summary.title}</Text>
        <Text style={styles.when}>{fmtWhen(summary.endedAt)}</Text>

        {isRun ? (
          <>
            <View style={[styles.heroCard, { borderColor: accent }]}>
              <Text style={styles.heroLbl}>{primary.label.toUpperCase()}</Text>
              <Text style={styles.heroVal}>
                {primary.value}
                <Text style={styles.heroUnit}> {primary.unit}</Text>
              </Text>
            </View>
            <View style={styles.grid}>{tiles.map(renderTile)}</View>
          </>
        ) : (
          <>
            <View style={styles.statStrip}>
              {tiles.slice(0, 3).map((t) => (
                <View key={t.label} style={styles.statStripItem}>
                  <Text style={styles.statStripLbl}>{t.label.toUpperCase()}</Text>
                  <Text style={styles.statStripVal}>{t.value}</Text>
                </View>
              ))}
            </View>
            <View style={styles.volumeRow}>
              <Text style={styles.volumeLbl}>Volume lifted</Text>
              <Text style={styles.volumeVal}>
                {primary.value} {primary.unit}
              </Text>
            </View>
            {summary.exerciseSets.map((ex) => (
              <View key={ex.name} style={styles.exCard}>
                <Text style={styles.exName}>{ex.name}</Text>
                <View style={styles.exRow}>
                  <Text style={[styles.exHeadText, { width: 30 }]}>SET</Text>
                  <Text style={[styles.exHeadText, { flex: 1 }]}>WEIGHT</Text>
                  <Text style={[styles.exHeadText, { flex: 1 }]}>REPS</Text>
                </View>
                {ex.sets.map((st, i) => (
                  <View key={i} style={styles.exRow}>
                    <Text style={[styles.exCell, { width: 30, color: colors.neutral500 }]}>{i + 1}</Text>
                    <Text style={[styles.exCell, { flex: 1 }]}>{fmtWeightAuto(st.weight, unitSystem)}</Text>
                    <Text style={[styles.exCell, { flex: 1 }]}>{st.reps}</Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={styles.grid}>{tiles.slice(3).map(renderTile)}</View>
          </>
        )}

        {hr && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Heart rate</Text>
            <Svg width="100%" height={90} viewBox="0 0 300 90" preserveAspectRatio="none">
              <Path d={seriesPath(hr, 300, 90)} stroke={colors.red} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </View>
        )}

        {isRun && summary.route && summary.route.length >= 2 && (
          <View style={[styles.card, { alignItems: 'center' }]}>
            <Text style={[styles.cardTitle, { alignSelf: 'flex-start' }]}>Route</Text>
            <RoutePolylineSvg route={summary.route} size={170} color={RUN_BLUE} />
          </View>
        )}

        {supported && !connected && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add steps and heart rate</Text>
            <Text style={styles.cardBody}>Connect {healthSourceName} and this summary fills in calories, steps and heart rate for every workout.</Text>
            <Pressable style={styles.connectBtn} onPress={handleConnect}>
              <Text style={styles.connectBtnText}>Connect {healthSourceName}</Text>
            </Pressable>
          </View>
        )}
        {connected && loading && !health && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.neutral500} />
            <Text style={styles.cardBody}>Getting your steps and heart rate…</Text>
          </View>
        )}
        {connected && !loading && health && health.steps == null && health.avgHeartRate == null && (
          <Text style={styles.note}>No steps or heart rate were recorded for this workout. Wearing a watch adds heart rate.</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.primaryBtn} onPress={() => setMode('share')}>
          <TrShareIcon size={16} color={colors.bg} />
          <Text style={styles.primaryBtnText}>Share</Text>
        </Pressable>
        <Pressable style={styles.ghostBtn} onPress={close}>
          <Text style={styles.ghostBtnText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function WorkoutSummaryOverlay() {
  const summary = useTrackerStore((s) => s.workoutSummary);
  if (!summary) return null;
  return <SummaryBody key={summary.endedAt} summary={summary} />;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg, zIndex: 80 },
  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20, gap: 14 },
  doneBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: fonts.semiBold, fontSize: 11, letterSpacing: 1.2, color: colors.green, marginTop: 6 },
  title: { fontFamily: fonts.semiBold, fontSize: 28, color: colors.text, marginTop: -6 },
  when: { fontFamily: fonts.regular, fontSize: 13, color: colors.neutral500, marginTop: -10 },
  heroCard: { backgroundColor: colors.surface, borderRadius: 26, padding: 22, borderLeftWidth: 4 },
  heroLbl: { fontFamily: fonts.semiBold, fontSize: 11, letterSpacing: 1, color: colors.neutral500 },
  heroVal: { fontFamily: fonts.extraBold, fontSize: 56, color: colors.text, letterSpacing: -1.5, marginTop: 4 },
  heroUnit: { fontFamily: fonts.semiBold, fontSize: 20, color: colors.neutral500 },
  statStrip: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.divider },
  statStripItem: { alignItems: 'center', gap: 6 },
  statStripLbl: { fontFamily: fonts.semiBold, fontSize: 10.5, letterSpacing: 0.8, color: colors.accent200 },
  statStripVal: { fontFamily: fonts.semiBold, fontSize: 24, color: colors.text },
  volumeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18 },
  volumeLbl: { fontFamily: fonts.medium, fontSize: 13.5, color: colors.neutral500 },
  volumeVal: { fontFamily: fonts.semiBold, fontSize: 17, color: colors.text },
  exCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, gap: 8 },
  exName: { fontFamily: fonts.semiBold, fontSize: 14.5, color: colors.text, marginBottom: 2 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exHeadText: { fontFamily: fonts.semiBold, fontSize: 9.5, letterSpacing: 0.6, color: colors.neutral500 },
  exCell: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48.5%', backgroundColor: colors.surface, borderRadius: 20, padding: 16, gap: 8 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileLbl: { fontFamily: fonts.semiBold, fontSize: 10, letterSpacing: 0.8, color: colors.neutral500 },
  tileVal: { fontFamily: fonts.semiBold, fontSize: 24, color: colors.text },
  tileUnit: { fontFamily: fonts.medium, fontSize: 12, color: colors.neutral500 },
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: 18, gap: 10 },
  cardTitle: { fontFamily: fonts.semiBold, fontSize: 14.5, color: colors.text },
  cardBody: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, color: colors.neutral500 },
  connectBtn: { alignSelf: 'flex-start', backgroundColor: colors.text, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 18, marginTop: 4 },
  connectBtnText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.bg },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.neutral500, paddingHorizontal: 4 },
  footer: { paddingHorizontal: 20, paddingTop: 10, gap: 8 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.text, borderRadius: 999, paddingVertical: 16 },
  primaryBtnText: { fontFamily: fonts.semiBold, fontSize: 15.5, color: colors.bg },
  ghostBtn: { alignItems: 'center', paddingVertical: 14 },
  ghostBtnText: { fontFamily: fonts.medium, fontSize: 14.5, color: colors.neutral500 },
  shareTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  shareTitle: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text },
  roundBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  roundBtnText: { fontSize: 22, lineHeight: 24, color: colors.text, marginTop: -2 },
  shareScroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 14 },
  designRow: { flexDirection: 'row', gap: 8 },
  designChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.divider },
  designChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  designChipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.neutral500 },
  designChipTextActive: { color: colors.bg },
  previewFrame: { width: '100%', borderRadius: 22, overflow: 'hidden', backgroundColor: colors.surface },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.divider, borderRadius: 999, paddingVertical: 13 },
  photoBtnText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
});
