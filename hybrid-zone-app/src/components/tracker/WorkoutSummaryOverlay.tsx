import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { colors, fonts } from '@/theme/trackerTokens';
import { TrBurnIcon, TrCheckIcon, TrClockIcon, TrElevationIcon, TrHeartrateIcon, TrPaceIcon, TrPlusIcon, TrShareIcon, TrStepsIcon } from '@/icons';
import { RoutePolylineSvg } from './RoutePolylineSvg';
import { useTrackerStore } from '@/store/trackerStore';
import { useHealthStore } from '@/store/healthStore';
import { healthSourceName, readWorkoutHealthStats, WorkoutHealthStats } from '@/engine/health';
import { elevationGainM, haversineDistanceKm, normalizeRouteToUnitSquare, routeHasAltitude, type RoutePoint } from '@/engine/gps';
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

interface Split {
  label: string;
  secPerKm: number;
  pace: string;
}

// Time for each full kilometre (or mile) of the run, from the GPS route. The
// exact crossing point is interpolated between fixes, so a split isn't off by
// however far apart two readings happened to be.
function splitsFromRoute(route: RoutePoint[] | null, unitSystem: UnitSystem): Split[] {
  if (!route || route.length < 2) return [];
  const unitKm = unitSystem === 'imperial' ? 1.609344 : 1;
  const out: Split[] = [];
  let cum = 0;
  let nextMark = unitKm;
  let markTime = route[0].timestamp;
  for (let i = 1; i < route.length; i++) {
    const seg = haversineDistanceKm(route[i - 1], route[i]);
    const dt = route[i].timestamp - route[i - 1].timestamp;
    while (seg > 0 && cum + seg >= nextMark) {
      const t = route[i - 1].timestamp + ((nextMark - cum) / seg) * dt;
      const sec = (t - markTime) / 1000;
      if (sec > 0) out.push({ label: String(out.length + 1), secPerKm: sec / unitKm, pace: fmtPaceFromSecPerKm(sec / unitKm, unitSystem) });
      markTime = t;
      nextMark += unitKm;
    }
    cum += seg;
  }
  return out;
}

function tileIcon(label: string) {
  const c = colors.neutral500;
  if (label === 'Time') return <TrClockIcon size={14} color={c} />;
  if (label === 'Elevation') return <TrElevationIcon size={14} color={c} />;
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
      {glow && <Path d={d} stroke={color} strokeOpacity={0.14} strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" />}
      {glow && <Path d={d} stroke={color} strokeOpacity={0.3} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />}
      <Path d={d} stroke={color} strokeWidth={hasRoute ? 6 : 4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ---------------- share designs ---------------- */

// A run has the original two cards; a lift has three. Every one of them can
// take the person's own photo as its background.
type Design = 'details' | 'neon' | 'stats' | 'card' | 'minimal';
const LIFT_DESIGNS: [Design, string][] = [
  ['details', 'Details'],
  ['neon', 'Neon'],
  ['stats', 'Stats'],
];
const RUN_DESIGNS: [Design, string][] = [
  ['card', 'Card'],
  ['minimal', 'Minimal'],
];

interface DetailRow {
  left: string;
  right: string;
}

interface CanvasProps {
  design: Design;
  w: number;
  summary: WorkoutSummaryData;
  health: WorkoutHealthStats | null;
  primary: Item;
  known: Item[];
  photoUri: string | null;
  detailRows: DetailRow[];
  detailOverflow: number;
  unitSystem: UnitSystem;
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

// The person's photo behind a design, darkened so the text on top stays readable.
function Backdrop({ photoUri, shade }: { photoUri: string | null; shade: number }) {
  if (!photoUri) return null;
  return (
    <>
      <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${shade})` }]} />
    </>
  );
}

const MIN_CARD_SCALE = 0.6;
const MAX_CARD_SCALE = 2.2;

// A run card the person can drag anywhere on the picture and pinch to resize.
// The gesture covers the whole canvas (not just the card, which is a small
// target), moves on both axes, and keeps the card inside the picture so it
// can't be pushed off an edge. Everything runs on shared values on the UI
// thread — no state updates while moving — which is what keeps it smooth.
function DraggableCard({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const cardW = useSharedValue(0);
  const cardH = useSharedValue(0);

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate((e) => {
      const maxX = Math.max(0, (w - cardW.value * scale.value) / 2);
      const maxY = Math.max(0, (h - cardH.value * scale.value) / 2);
      tx.value = Math.min(maxX, Math.max(-maxX, startX.value + e.translationX));
      ty.value = Math.min(maxY, Math.max(-maxY, startY.value + e.translationY));
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(MAX_CARD_SCALE, Math.max(MIN_CARD_SCALE, startScale.value * e.scale));
      // Growing next to an edge must not push the card out of the picture.
      const maxX = Math.max(0, (w - cardW.value * scale.value) / 2);
      const maxY = Math.max(0, (h - cardH.value * scale.value) / 2);
      tx.value = Math.min(maxX, Math.max(-maxX, tx.value));
      ty.value = Math.min(maxY, Math.max(-maxY, ty.value));
    });

  const gesture = Gesture.Simultaneous(pan, pinch);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }] }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Animated.View
          style={style}
          onLayout={(e) => {
            cardW.value = e.nativeEvent.layout.width;
            cardH.value = e.nativeEvent.layout.height;
          }}
        >
          {children}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function ShareCanvas({ design, w, summary, health, primary, known, photoUri, detailRows, detailOverflow, unitSystem }: CanvasProps) {
  const u = w / 360;
  const h = (w * 16) / 9;
  const pad = 26 * u;
  const secondary = known.filter((k) => k.label !== primary.label);

  /* ---- run: the two original cards ---- */
  if (design === 'card' || design === 'minimal') {
    const km = summary.distanceKm ?? 0;
    const dist = distanceValueOnly(km, unitSystem, 2);
    const unit = distanceUnitLabel(unitSystem);
    const pace = km > 0.02 ? `${fmtPaceFromSecPerKm(summary.durationSec / km, unitSystem)}/${unit}` : '—';
    const time = fmtDuration(summary.durationSec);
    const route = summary.route ?? [];
    const lbl = { fontSize: 9.5 * u, letterSpacing: 0.5 * u, textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.65)' };

    return (
      <View style={{ width: w, height: h, overflow: 'hidden', backgroundColor: '#151517' }}>
        <Backdrop photoUri={photoUri} shade={0.28} />
        <DraggableCard w={w} h={h}>
          {design === 'card' ? (
            <View
              style={{
                width: w * 0.66,
                backgroundColor: 'rgba(10,10,11,0.55)',
                borderRadius: 16 * u,
                padding: 15 * u,
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.85)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Image source={require('../../../assets/logo-mark.png')} style={{ width: 22 * u, height: 22 * u, tintColor: '#fff' }} resizeMode="contain" />
                <RoutePolylineSvg route={route} size={46 * u} color="#fff" />
              </View>
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.35)', marginVertical: 11 * u }} />
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 * u }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 30 * u, color: '#fff' }}>{dist}</Text>
                <Text style={{ fontSize: 13 * u, color: 'rgba(255,255,255,0.75)' }}>{unit}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 20 * u, marginTop: 9 * u }}>
                <View>
                  <Text style={lbl}>Pace</Text>
                  <Text style={{ fontFamily: fonts.semiBold, fontSize: 13.5 * u, color: '#fff', marginTop: 2 * u }}>{pace}</Text>
                </View>
                <View>
                  <Text style={lbl}>Time</Text>
                  <Text style={{ fontFamily: fonts.semiBold, fontSize: 13.5 * u, color: '#fff', marginTop: 2 * u }}>{time}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Image source={require('../../../assets/logo-mark.png')} style={{ width: 22 * u, height: 22 * u, tintColor: '#fff' }} resizeMode="contain" />
              <View style={{ marginTop: 14 * u }}>
                <RoutePolylineSvg route={route} size={78 * u} color="#fff" />
              </View>
              <Text style={[lbl, { marginTop: 14 * u }]}>Distance</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 30 * u, color: '#fff', marginTop: 2 * u }}>
                {dist} {unit}
              </Text>
              <View style={{ width: 74 * u, height: 1, backgroundColor: 'rgba(255,255,255,0.35)', marginTop: 10 * u }} />
              <Text style={[lbl, { marginTop: 12 * u }]}>Pace</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 21 * u, color: '#fff', marginTop: 2 * u }}>{pace}</Text>
              <View style={{ width: 74 * u, height: 1, backgroundColor: 'rgba(255,255,255,0.35)', marginTop: 10 * u }} />
              <Text style={[lbl, { marginTop: 12 * u }]}>Time</Text>
              <Text style={{ fontFamily: fonts.bold, fontSize: 21 * u, color: '#fff', marginTop: 2 * u }}>{time}</Text>
            </View>
          )}
        </DraggableCard>
      </View>
    );
  }

  /* ---- lift: details ---- */
  if (design === 'details') {
    return (
      <View style={{ width: w, height: h, backgroundColor: '#0d0d0f', padding: pad, overflow: 'hidden' }}>
        <Backdrop photoUri={photoUri} shade={0.62} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Brand u={u} />
          <Text style={{ fontFamily: fonts.medium, fontSize: 11 * u, color: 'rgba(255,255,255,0.6)' }}>{fmtWhen(summary.endedAt)}</Text>
        </View>

        <Text style={{ fontFamily: fonts.semiBold, fontSize: 12.5 * u, letterSpacing: 1.2 * u, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', marginTop: 20 * u }} numberOfLines={1}>
          {summary.title}
        </Text>
        <Text style={{ fontFamily: fonts.extraBold, fontSize: 46 * u, color: '#fff', letterSpacing: -1 * u, marginTop: 2 * u }}>
          {primary.value}
          <Text style={{ fontFamily: fonts.semiBold, fontSize: 18 * u, color: 'rgba(255,255,255,0.6)' }}> {primary.unit}</Text>
        </Text>

        <View style={{ marginTop: 16 * u }}>
          <StatRow items={secondary.slice(0, 3)} u={u} />
        </View>

        <View style={{ marginTop: 18 * u, gap: 8 * u }}>
          {detailRows.length === 0 && <Text style={{ fontFamily: fonts.regular, fontSize: 12 * u, color: 'rgba(255,255,255,0.5)' }}>No sets recorded.</Text>}
          {detailRows.map((r, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10 * u,
                paddingVertical: 9 * u,
                paddingHorizontal: 13 * u,
                backgroundColor: 'rgba(255,255,255,0.09)',
                borderRadius: 13 * u,
              }}
            >
              <Text style={{ flex: 1, fontFamily: fonts.semiBold, fontSize: 12.5 * u, color: '#fff' }} numberOfLines={1}>
                {r.left}
              </Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 11.5 * u, color: 'rgba(255,255,255,0.78)' }} numberOfLines={1}>
                {r.right}
              </Text>
            </View>
          ))}
          {detailOverflow > 0 && <Text style={{ fontFamily: fonts.medium, fontSize: 11 * u, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>+{detailOverflow} more</Text>}
        </View>
      </View>
    );
  }

  /* ---- lift: neon ---- */
  if (design === 'neon') {
    return (
      <View style={{ width: w, height: h, backgroundColor: '#050807', padding: pad, justifyContent: 'space-between', overflow: 'hidden' }}>
        <Backdrop photoUri={photoUri} shade={0.6} />
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

  /* ---- lift: stats — the big numbers along the bottom ---- */
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
  const [design, setDesign] = useState<Design>(summary.kind === 'run' ? 'card' : 'details');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const shotRef = useRef<ViewShot>(null);

  const { primary, tiles, known } = buildStats(summary, health, unitSystem);
  const splits = useMemo(() => splitsFromRoute(summary.route, unitSystem), [summary.route, unitSystem]);
  // The exercise breakdown for the lift "Details" card — capped so a long
  // workout still fits, with the rest counted below it.
  const detailRows = useMemo<DetailRow[]>(
    () =>
      summary.exerciseSets.slice(0, 6).map((ex) => ({
        left: ex.name,
        right: ex.sets.map((st) => `${weightValueAuto(st.weight, unitSystem)}×${st.reps}`).join('  '),
      })),
    [summary, unitSystem],
  );
  const detailOverflow = Math.max(0, summary.exerciseSets.length - 6);

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
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Photo access needed', 'Allow photo library access to add a background image.');
        return;
      }
      // Clearing the current photo first guarantees the picker opens fresh
      // (rather than against whatever the last pick left behind) — a photo
      // already set shouldn't ever block choosing a different one.
      setPhotoUri(null);
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsMultipleSelection: false });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Couldn't open your photos", 'Please try again.');
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
    const designs = isRun ? RUN_DESIGNS : LIFT_DESIGNS;
    // The card is as large as fits above the buttons, never taller than the screen.
    const canvasW = Math.floor(Math.min(area.w, (area.h * 9) / 16));
    return (
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.shareTop}>
          <Pressable style={styles.roundBtn} onPress={() => setMode('summary')}>
            <Text style={styles.roundBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.shareTitle}>Share your {isRun ? 'run' : 'workout'}</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.designRow}>
          {designs.map(([id, label]) => (
            <Pressable key={id} style={[styles.designChip, design === id && styles.designChipActive]} onPress={() => setDesign(id)}>
              <Text style={[styles.designChipText, design === id && styles.designChipTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.previewArea} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {canvasW > 0 && (
            <View style={[styles.previewFrame, { width: canvasW }]}>
              <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }}>
                <ShareCanvas
                  design={design}
                  w={canvasW}
                  summary={summary}
                  health={health}
                  primary={primary}
                  known={known}
                  photoUri={photoUri}
                  detailRows={detailRows}
                  detailOverflow={detailOverflow}
                  unitSystem={unitSystem}
                />
              </ViewShot>
            </View>
          )}
        </View>
        {isRun && <Text style={styles.hint}>Drag the card to move it · pinch to resize</Text>}

        <View style={styles.photoRow}>
          <Pressable style={[styles.photoBtn, { flex: 1 }]} onPress={pickPhoto}>
            <TrPlusIcon size={14} color={colors.text} />
            <Text style={styles.photoBtnText}>{photoUri ? 'Change photo' : 'Add your own photo'}</Text>
          </Pressable>
          {photoUri && (
            <Pressable style={styles.photoBtn} onPress={() => setPhotoUri(null)}>
              <Text style={styles.photoBtnText}>Remove</Text>
            </Pressable>
          )}
        </View>
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
            <View style={styles.statStrip}>
              {[primary, tiles[0], tiles[1]].map((t) => (
                <View key={t.label} style={styles.statStripItem}>
                  <Text style={styles.statStripLbl}>{t.label.toUpperCase()}</Text>
                  <Text style={styles.statStripVal}>
                    {t.value}
                    {t.unit ? <Text style={styles.tileUnit}> {t.unit}</Text> : null}
                  </Text>
                </View>
              ))}
            </View>
            {summary.route && summary.route.length >= 2 && (
              <View style={[styles.card, { alignItems: 'center' }]}>
                <Text style={[styles.cardTitle, { alignSelf: 'flex-start' }]}>Route</Text>
                <RoutePolylineSvg route={summary.route} size={260} color={RUN_BLUE} strokeWidth={7} />
              </View>
            )}
            <View style={styles.grid}>
              {tiles.slice(2).map(renderTile)}
              {summary.route && routeHasAltitude(summary.route) &&
                renderTile({
                  label: 'Elevation',
                  value: String(Math.round(unitSystem === 'imperial' ? elevationGainM(summary.route) * 3.28084 : elevationGainM(summary.route))),
                  unit: unitSystem === 'imperial' ? 'ft' : 'm',
                })}
            </View>
            {splits.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Splits</Text>
                {splits.map((sp) => {
                  const fastest = Math.min(...splits.map((x) => x.secPerKm));
                  return (
                    <View key={sp.label} style={styles.splitRow}>
                      <Text style={styles.splitKm}>{sp.label}</Text>
                      <View style={styles.splitTrack}>
                        <View style={[styles.splitFill, { width: `${Math.max(18, (fastest / sp.secPerKm) * 100)}%` }]} />
                      </View>
                      <Text style={styles.splitPace}>
                        {sp.pace}
                        <Text style={styles.tileUnit}> /{distanceUnitLabel(unitSystem)}</Text>
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
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
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 3 },
  splitKm: { width: 20, fontFamily: fonts.semiBold, fontSize: 13, color: colors.neutral500 },
  splitTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.bg, overflow: 'hidden' },
  splitFill: { height: 10, borderRadius: 5, backgroundColor: RUN_BLUE },
  splitPace: { minWidth: 86, textAlign: 'right', fontFamily: fonts.semiBold, fontSize: 13.5, color: colors.text },
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
  designRow: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 4 },
  previewArea: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginVertical: 12 },
  hint: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 11.5, color: colors.neutral500, marginBottom: 10 },
  photoRow: { flexDirection: 'row', gap: 8, marginHorizontal: 20 },
  designChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.divider },
  designChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  designChipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.neutral500 },
  designChipTextActive: { color: colors.bg },
  previewFrame: { borderRadius: 22, overflow: 'hidden', backgroundColor: colors.surface },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.divider, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 18 },
  photoBtnText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
});
