import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Stepper } from '@/components/Stepper';
import { DraggableDayChip, CHIP_SIZE } from '@/components/onboarding/DraggableDayChip';
import { useOnboardingStore } from '@/store/onboardingStore';
import { colors, fonts, typography } from '@/theme/tokens';
import { BarbellIcon, InfoIcon, RunIcon, XIcon } from '@/icons';
import { DAY_NAMES, DAY_ORDER, Dow, Discipline, countDays } from '@/engine/schedule';
import type { OnboardingStackParamList } from '@/navigation/types';

interface Point {
  x: number;
  y: number;
}
interface Rect extends Point {
  width: number;
  height: number;
}
interface PendingChip {
  id: string;
  type: Discipline;
  // null until its tray slot has been measured — the overlay chip only
  // renders once this is known, so it always appears exactly over its slot.
  origin: Point | null;
}

const MAX_DAYS = DAY_ORDER.length;
// Extra margin around a day cell's measured rect that still counts as a hit —
// makes the drop target more forgiving than the cell's exact visual bounds.
const DROP_PADDING = 18;
// How long a successfully-dropped chip's snap-and-fade animation gets to
// play before it's actually removed from the pending list. Purely a JS
// setTimeout, not tied to any animation completion callback — see
// DraggableDayChip for why that distinction matters.
const DROP_SETTLE_MS = 240;

function ModeSeg({ mode, onChange }: { mode: Discipline; onChange: (m: Discipline) => void }) {
  return (
    <View style={styles.modeSeg}>
      {(['strength', 'running'] as Discipline[]).map((m) => {
        const active = mode === m;
        return (
          <Pressable key={m} onPress={() => onChange(m)} style={[styles.modeBtn, active && styles.modeBtnActive]}>
            <Text style={[styles.modeBtnText, active && styles.modeBtnTextActive]}>
              {m === 'strength' ? 'Strength' : 'Running'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ScheduleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'Schedule'>>();
  const { schedule, dayPickMode, setMode, tapDay, assignDay, decDay } = useOnboardingStore();
  const [pendingChips, setPendingChips] = useState<PendingChip[]>([]);

  // Everything below converts on-screen (window) coordinates into a shared
  // "overlay-local" space — the overlay renders outside the ScrollView (see
  // OnboardingScreen's `overlay` prop) specifically so dragging isn't
  // affected by scroll offset, which means both a chip's tray-slot origin
  // and the day cells' rects have to be measured in window space and then
  // shifted by the overlay's own window origin to land in the same frame.
  const overlayRef = useRef<View>(null);
  const overlayOriginRef = useRef<Point>({ x: 0, y: 0 });
  const dayCellRefs = useRef<Partial<Record<Dow, View | null>>>({});
  const dayRectsRef = useRef<Partial<Record<Dow, Rect>>>({});
  const traySlotRefs = useRef<Partial<Record<string, View | null>>>({});

  const measureOverlayOrigin = (cb?: () => void) => {
    overlayRef.current?.measureInWindow((x, y) => {
      overlayOriginRef.current = { x, y };
      cb?.();
    });
  };

  const measureDayCells = () => {
    measureOverlayOrigin(() => {
      DAY_ORDER.forEach((d) => {
        dayCellRefs.current[d]?.measureInWindow((x, y, width, height) => {
          dayRectsRef.current[d] = {
            x: x - overlayOriginRef.current.x,
            y: y - overlayOriginRef.current.y,
            width,
            height,
          };
        });
      });
    });
  };

  const measureTraySlot = (chipId: string) => {
    measureOverlayOrigin(() => {
      traySlotRefs.current[chipId]?.measureInWindow((x, y, width, height) => {
        const origin = { x: x - overlayOriginRef.current.x + width / 2, y: y - overlayOriginRef.current.y + height / 2 };
        setPendingChips((prev) => prev.map((c) => (c.id === chipId && !c.origin ? { ...c, origin } : c)));
      });
    });
  };

  const sN = countDays(schedule, 'strength');
  const rN = countDays(schedule, 'running');
  const total = sN + rN;
  const msg =
    total <= 4
      ? 'Plenty of recovery room.'
      : total <= 6
        ? 'Balanced weekly volume.'
        : total <= 8
          ? 'Highly balanced weekly volume.'
          : 'Aggressive volume — make sure you can recover.';

  const spawnChip = (type: Discipline) => () => {
    const committed = countDays(schedule, type);
    const pending = pendingChips.filter((c) => c.type === type).length;
    if (committed + pending >= MAX_DAYS) return;
    setPendingChips((prev) => [...prev, { id: `${type}-${Date.now()}-${Math.random()}`, type, origin: null }]);
  };

  // Decrementing removes a committed day, but a still-undropped chip of the
  // same type left floating around afterward is just confusing (there's no
  // "day" left to give it) — clear those too so nothing gets stranded.
  const decrementAndClear = (type: Discipline) => () => {
    decDay(type);
    setPendingChips((prev) => prev.filter((c) => c.type !== type));
  };

  const resolveDrop = (type: Discipline) => (center: Point) => {
    for (const day of DAY_ORDER) {
      const r = dayRectsRef.current[day];
      if (!r) continue;
      const hit =
        center.x >= r.x - DROP_PADDING &&
        center.x <= r.x + r.width + DROP_PADDING &&
        center.y >= r.y - DROP_PADDING &&
        center.y <= r.y + r.height + DROP_PADDING;
      if (!hit) continue;
      if (useOnboardingStore.getState().schedule[day][type]) return null; // already assigned — reject
      return { day, center: { x: r.x + r.width / 2, y: r.y + r.height / 2 } };
    }
    return null;
  };

  const handleDropped = (chipId: string, type: Discipline) => (day: Dow) => {
    assignDay(day, type);
    setTimeout(() => {
      setPendingChips((prev) => prev.filter((c) => c.id !== chipId));
    }, DROP_SETTLE_MS);
  };

  const handleCancelled = (chipId: string) => () => {
    setPendingChips((prev) => prev.filter((c) => c.id !== chipId));
  };

  return (
    <OnboardingScreen
      progress={84}
      footer={<PrimaryButton label="Continue" onPress={() => navigation.navigate('Split')} />}
      overlay={
        <View ref={overlayRef} style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {pendingChips
            .filter((c): c is PendingChip & { origin: Point } => c.origin !== null)
            .map((chip) => (
              <DraggableDayChip
                key={chip.id}
                type={chip.type}
                origin={chip.origin}
                resolveDrop={resolveDrop(chip.type)}
                onDropped={handleDropped(chip.id, chip.type)}
                onCancelled={handleCancelled(chip.id)}
              />
            ))}
        </View>
      }
    >
      <Text style={[typography.title, { color: colors.text, marginBottom: 10 }]}>Build your week</Text>
      <Text style={[typography.subtitle, { marginBottom: 22 }]}>
        Add a strength or running day below, then drag it onto the day of the week you want.
      </Text>

      <ModeSeg mode={dayPickMode} onChange={setMode} />

      <View style={styles.dayGrid} onLayout={measureDayCells}>
        {DAY_ORDER.map((d: Dow) => {
          const c = schedule[d];
          const both = c.strength && c.running;
          const active = c.strength || c.running;
          const iconSize = both ? 12 : 16;
          return (
            <View key={d} style={styles.dayCol}>
              <Text style={styles.dayName}>{DAY_NAMES[d]}</Text>
              <Pressable
                ref={(el) => {
                  dayCellRefs.current[d] = el;
                }}
                onLayout={measureDayCells}
                onPress={() => tapDay(d)}
                style={[styles.dayCell, active && styles.dayCellActive]}
              >
                {both ? (
                  <>
                    <BarbellIcon size={iconSize} color="#000" />
                    <RunIcon size={iconSize} color={colors.blue} />
                  </>
                ) : c.strength ? (
                  <BarbellIcon size={iconSize} color="#000" />
                ) : c.running ? (
                  <RunIcon size={iconSize} color={colors.blue} />
                ) : (
                  <XIcon size={16} color="#48484a" />
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={styles.tray}>
        {pendingChips.length === 0 ? (
          <Text style={styles.trayEmptyText}>New days you add below will appear here — drag them onto a day above</Text>
        ) : (
          pendingChips.map((chip) => (
            <View
              key={chip.id}
              ref={(el) => {
                traySlotRefs.current[chip.id] = el;
              }}
              onLayout={() => measureTraySlot(chip.id)}
              style={styles.traySlot}
            />
          ))
        )}
      </View>

      <Stepper
        icon={<BarbellIcon size={16} color={colors.text} />}
        label="Strength days"
        count={sN}
        onInc={spawnChip('strength')}
        onDec={decrementAndClear('strength')}
      />
      <Stepper
        icon={<RunIcon size={16} color={colors.blue} />}
        label="Running days"
        count={rN}
        onInc={spawnChip('running')}
        onDec={decrementAndClear('running')}
      />

      <View style={styles.infoBanner}>
        <InfoIcon />
        <Text style={styles.infoText}>
          {total} of 8 sessions used. {msg}
        </Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  modeSeg: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 999, padding: 4, marginBottom: 22 },
  modeBtn: { flex: 1, paddingVertical: 11, borderRadius: 999, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.text },
  modeBtnText: { fontFamily: fonts.bold, fontSize: 13.5, color: colors.textDim },
  modeBtnTextActive: { color: '#000' },
  dayGrid: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  dayCol: { flex: 1, alignItems: 'center', gap: 8 },
  dayName: { fontFamily: fonts.bold, fontSize: 11, color: colors.textDimmer },
  dayCell: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  dayCellActive: { backgroundColor: colors.text },
  tray: {
    minHeight: CHIP_SIZE + 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 12,
    marginBottom: 20,
  },
  trayEmptyText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textDimmer,
    textAlign: 'center',
    lineHeight: 18,
  },
  traySlot: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.track,
  },
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
  },
  infoText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textDim, lineHeight: 19 },
});
