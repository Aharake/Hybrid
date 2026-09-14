import React, { useRef, useState } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingScreen } from '@/components/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Stepper } from '@/components/Stepper';
import { DraggableDayChip } from '@/components/onboarding/DraggableDayChip';
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
  origin: Point;
}

const MAX_DAYS = DAY_ORDER.length;
// Extra margin around a day cell's measured rect that still counts as a hit —
// makes the drop target more forgiving than the cell's exact visual bounds.
const DROP_PADDING = 18;

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
  // affected by scroll offset, which means both the chip's spawn point and
  // the day cells' rects have to be measured in window space and then
  // shifted by the overlay's own window origin to land in the same frame.
  const overlayRef = useRef<View>(null);
  const overlayOriginRef = useRef<Point>({ x: 0, y: 0 });
  const dayCellRefs = useRef<Partial<Record<Dow, View | null>>>({});
  const dayRectsRef = useRef<Partial<Record<Dow, Rect>>>({});

  const measureAll = () => {
    overlayRef.current?.measureInWindow((x, y) => {
      overlayOriginRef.current = { x, y };
    });
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

  const spawnChip = (type: Discipline) => (e: GestureResponderEvent) => {
    const committed = countDays(schedule, type);
    const pending = pendingChips.filter((c) => c.type === type).length;
    if (committed + pending >= MAX_DAYS) return;
    const { pageX, pageY } = e.nativeEvent;
    const origin = { x: pageX - overlayOriginRef.current.x, y: pageY - overlayOriginRef.current.y };
    setPendingChips((prev) => [...prev, { id: `${type}-${Date.now()}-${Math.random()}`, type, origin }]);
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
    setPendingChips((prev) => prev.filter((c) => c.id !== chipId));
  };

  return (
    <OnboardingScreen
      progress={84}
      footer={<PrimaryButton label="Continue" onPress={() => navigation.navigate('Split')} />}
      overlay={
        <View ref={overlayRef} style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {pendingChips.map((chip) => (
            <DraggableDayChip
              key={chip.id}
              type={chip.type}
              origin={chip.origin}
              resolveDrop={resolveDrop(chip.type)}
              onDropped={handleDropped(chip.id, chip.type)}
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

      <View style={styles.dayGrid} onLayout={measureAll}>
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
                onLayout={measureAll}
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

      {pendingChips.length > 0 && (
        <Text style={styles.dragHint}>
          Drag {pendingChips.length > 1 ? 'the new days' : 'the new day'} onto the calendar above
        </Text>
      )}

      <Stepper
        icon={<BarbellIcon size={16} color={colors.text} />}
        label="Strength days"
        count={sN}
        onInc={spawnChip('strength')}
        onDec={() => decDay('strength')}
      />
      <Stepper
        icon={<RunIcon size={16} color={colors.blue} />}
        label="Running days"
        count={rN}
        onInc={spawnChip('running')}
        onDec={() => decDay('running')}
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
  dayGrid: { flexDirection: 'row', gap: 6, marginBottom: 20 },
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
  dragHint: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: -10,
    marginBottom: 18,
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
