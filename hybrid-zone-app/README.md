# Hybrid Zone — starter scaffold

Expo + React Native + TypeScript. This is a starting point, not the full app —
it wires up the design system and the pattern to follow for the rest of the
onboarding flow.

## Run it

```
npm install
```

Scan the QR code with Expo Go, or press `i` / `a` for a simulator.

## What's in here

- `src/theme/tokens.ts` — colors, spacing, radius, type. Matches the HTML
  mockups exactly. Change a color here, not in individual screens.
- `src/engine/schedule.ts` — pure functions for the weekly schedule: day caps,
  toggling a day on/off per discipline, auto-fill from day counts, and a
  `recommendWeek()` placeholder for the real recommendation logic (Section 5
  of the training spec). No React here on purpose — this should be unit
  tested directly and reused by both the onboarding screen and any later
  "edit my schedule" screen.
- `src/components/DayCell.tsx` — the split top/bottom (strength/running) day
  cell from the schedule builder mockup, with the Reanimated spring "pop"
  on change.
- `src/components/PrimaryButton.tsx` — the white pill CTA used on every
  screen's bottom bar.
- `src/screens/onboarding/StartingPointScreen.tsx` — Step 1.
- `src/screens/onboarding/ExperienceScreen.tsx` — Step 2, including the
  "also train running?" toggle that conditionally reveals the running
  experience row.
- `src/navigation/OnboardingNavigator.tsx` — stack navigator holding the
  flow's answers in local state for now. Swap for Zustand/Context once more
  screens are added — passing an ever-growing `answers` object through
  `useState` won't scale past ~4-5 screens.

## Not built yet (same pattern applies to each)

Goal · Gym · Running · Schedule (recommended, editable — port the mockup's
tap-to-cycle logic onto `DayCell` + `engine/schedule.ts`, which already has
the toggle/auto-fill functions ready) · Building your plan (animated
loading) · Summary · Paywall (RevenueCat integration for the 3-day trial).

## Design system notes carried over from the mockups

- Section color signals context: green while in a strength-related screen,
  blue while in running, white/neutral for section-agnostic screens
  (Starting Point, Summary, Paywall).
- White is reserved for primary actions and the neutral/"you" color — never
  used as a session-type color.
- Reanimated (not the legacy `Animated` API) for anything that needs to feel
  snappy on lower-end Android — the day cell pop is the first example;
  reuse `withSpring` for future interactive elements rather than timing-based
  animations.
