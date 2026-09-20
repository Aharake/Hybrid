// The exercise catalogue: every movement the app can put in a program or offer
// in the "Add Exercise" pickers, tagged with the equipment it needs so the
// program builder never hands a bodyweight-only user a barbell lift.
//   bw  = no equipment
//   db  = dumbbells (or bodyweight)
//   gym = needs a full gym (machines/barbells/cables)
// Order inside a group is priority order: compound lifts first, then
// isolation — the builder takes exercises top-down.

export type MuscleGroupKey = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs';
export type ExerciseTier = 'bw' | 'db' | 'gym';
export type EquipmentChoice = 'gym' | 'dumbbells' | 'bodyweight';

export interface LibraryExercise {
  name: string;
  tier: ExerciseTier;
}

export const EXERCISE_LIBRARY: Record<MuscleGroupKey, LibraryExercise[]> = {
  Chest: [
    { name: 'Barbell Bench Press', tier: 'gym' },
    { name: 'Incline DB Press', tier: 'db' },
    { name: 'Push-Ups', tier: 'bw' },
    { name: 'DB Bench Press', tier: 'db' },
    { name: 'Pec Deck Fly', tier: 'gym' },
    { name: 'Incline Push-Ups', tier: 'bw' },
    { name: 'DB Fly', tier: 'db' },
    { name: 'Diamond Push-Ups', tier: 'bw' },
  ],
  Back: [
    { name: 'Lat Pulldown', tier: 'gym' },
    { name: 'Pull-Ups', tier: 'bw' },
    { name: 'Barbell Row', tier: 'gym' },
    { name: 'Single-Arm DB Row', tier: 'db' },
    { name: 'Seated Cable Row', tier: 'gym' },
    { name: 'T-Bar Row', tier: 'gym' },
    { name: 'Inverted Rows', tier: 'bw' },
    { name: 'Deadlift', tier: 'gym' },
    { name: 'Superman Hold', tier: 'bw' },
  ],
  Shoulders: [
    { name: 'Shoulder Press', tier: 'db' },
    { name: 'Barbell Overhead Press', tier: 'gym' },
    { name: 'Lateral Raises', tier: 'db' },
    { name: 'Pike Push-Ups', tier: 'bw' },
    { name: 'Rear Delt Raises', tier: 'db' },
    { name: 'Handstand Hold', tier: 'bw' },
  ],
  Arms: [
    { name: 'DB Curl', tier: 'db' },
    { name: 'Dips', tier: 'bw' },
    { name: 'Preacher Curl', tier: 'gym' },
    { name: 'Cable Tricep Pushdown', tier: 'gym' },
    { name: 'DB Hammer Curl', tier: 'db' },
    { name: 'Overhead Tricep Extension', tier: 'db' },
    { name: 'Cable Hammer Curl', tier: 'gym' },
    { name: 'Skull Crushers', tier: 'gym' },
    { name: 'Close-Grip Push-Ups', tier: 'bw' },
    { name: 'Chin-Ups', tier: 'bw' },
  ],
  Legs: [
    { name: 'Barbell Back Squat', tier: 'gym' },
    { name: 'Goblet Squat', tier: 'db' },
    { name: 'Bodyweight Squats', tier: 'bw' },
    { name: 'RDL', tier: 'gym' },
    { name: 'DB Romanian Deadlift', tier: 'db' },
    { name: 'Walking Lunges', tier: 'bw' },
    { name: 'Leg Press', tier: 'gym' },
    { name: 'Bulgarian Split Squat', tier: 'db' },
    { name: 'Glute Bridges', tier: 'bw' },
    { name: 'Leg Curl', tier: 'gym' },
    { name: 'Leg Extension', tier: 'gym' },
    { name: 'Squat', tier: 'gym' },
    { name: 'Calf Raises', tier: 'bw' },
  ],
};

// Flat name lists per group — what the "Add Exercise" pickers search.
export const EXERCISE_POOL: Record<MuscleGroupKey, string[]> = Object.fromEntries(
  (Object.keys(EXERCISE_LIBRARY) as MuscleGroupKey[]).map((g) => [g, EXERCISE_LIBRARY[g].map((e) => e.name)]),
) as Record<MuscleGroupKey, string[]>;

const ALLOWED_TIERS: Record<EquipmentChoice, ExerciseTier[]> = {
  gym: ['gym', 'db', 'bw'],
  dumbbells: ['db', 'bw'],
  bodyweight: ['bw'],
};

export function exercisesFor(group: MuscleGroupKey, equipment: EquipmentChoice | null): string[] {
  const allowed = ALLOWED_TIERS[equipment ?? 'gym'];
  return EXERCISE_LIBRARY[group].filter((e) => allowed.includes(e.tier)).map((e) => e.name);
}

// Best-effort muscle group for an exercise name (custom names return null).
export function groupOfExercise(name: string): MuscleGroupKey | null {
  const lower = name.toLowerCase();
  for (const g of Object.keys(EXERCISE_LIBRARY) as MuscleGroupKey[]) {
    if (EXERCISE_LIBRARY[g].some((e) => e.name.toLowerCase() === lower)) return g;
  }
  return null;
}

// Per-group tallies shown on a session card (how many exercises hit each
// muscle group, against a rough weekly-volume ceiling).
export function deriveMuscleGroups(exercises: { group: string }[]): { name: MuscleGroupKey; current: number; max: number }[] {
  const counts: Record<string, number> = {};
  exercises.forEach((ex) => {
    counts[ex.group] = (counts[ex.group] || 0) + 1;
  });
  return Object.keys(counts).map((g) => ({ name: g as MuscleGroupKey, current: counts[g], max: g === 'Legs' ? 20 : 18 }));
}
