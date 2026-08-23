import { config } from "dotenv";
config({ path: ".env.local" });

import { inArray } from "drizzle-orm";
import type { db as DbType } from "./index";
import { exercises, workouts, workoutExercises, sets } from "./schema";

type Db = typeof DbType;

const USER_ID = "user_3IIHzKV92HajsMNyfCm1SNjErSU";
const NUM_WORKOUTS = 15;
const DAYS_SPAN = 42;
const WORKOUT_NAMES = [null, "Push Day", "Pull Day", "Leg Day", "Full Body"];

const EXERCISE_LIBRARY = [
  { name: "Barbell Back Squat", baseWeight: 135 },
  { name: "Bench Press", baseWeight: 115 },
  { name: "Deadlift", baseWeight: 155 },
  { name: "Overhead Press", baseWeight: 65 },
  { name: "Barbell Row", baseWeight: 95 },
  { name: "Pull-Up", baseWeight: null },
  { name: "Push-Up", baseWeight: null },
  { name: "Dumbbell Lunge", baseWeight: 30 },
  { name: "Leg Press", baseWeight: 180 },
  { name: "Lat Pulldown", baseWeight: 80 },
  { name: "Bicep Curl", baseWeight: 25 },
  { name: "Tricep Pushdown", baseWeight: 40 },
  { name: "Romanian Deadlift", baseWeight: 115 },
  { name: "Incline Dumbbell Press", baseWeight: 40 },
  { name: "Seated Cable Row", baseWeight: 90 },
] as const;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choice<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function pickN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

async function seedExercises(db: Db) {
  const names = EXERCISE_LIBRARY.map((e) => e.name);
  const existing = await db
    .select({ name: exercises.name })
    .from(exercises)
    .where(inArray(exercises.name, names));
  const existingNames = new Set(existing.map((e) => e.name));

  const toInsert = EXERCISE_LIBRARY.filter((e) => !existingNames.has(e.name)).map((e) => ({
    name: e.name,
  }));
  if (toInsert.length > 0) {
    await db.insert(exercises).values(toInsert);
  }

  const all = await db
    .select({ id: exercises.id, name: exercises.name })
    .from(exercises)
    .where(inArray(exercises.name, names));
  const idByName = new Map(all.map((e) => [e.name, e.id]));
  return EXERCISE_LIBRARY.map((e) => ({ ...e, id: idByName.get(e.name)! }));
}

async function seedWorkouts(db: Db) {
  const offsets = pickN(
    Array.from({ length: DAYS_SPAN }, (_, i) => i),
    NUM_WORKOUTS,
  ).sort((a, b) => b - a); // oldest (largest offset) first

  const now = Date.now();
  const rows = offsets.map((daysAgo, index) => {
    const startedAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    const isInProgress = index >= NUM_WORKOUTS - 2; // two most recent workouts
    const completedAt = isInProgress
      ? null
      : new Date(startedAt.getTime() + randomInt(45, 90) * 60 * 1000);
    return {
      userId: USER_ID,
      name: choice(WORKOUT_NAMES),
      startedAt,
      completedAt,
    };
  });

  const inserted = await db
    .insert(workouts)
    .values(rows)
    .returning({ id: workouts.id });

  return inserted.map((w, index) => ({ id: w.id, progressionIndex: index }));
}

async function seedWorkoutExercises(
  db: Db,
  seededWorkouts: { id: string; progressionIndex: number }[],
  exerciseLibrary: { id: string; name: string; baseWeight: number | null }[],
) {
  const rows: { workoutId: string; exerciseId: string; position: number }[] = [];
  const meta: { progressionIndex: number; baseWeight: number | null }[] = [];

  for (const workout of seededWorkouts) {
    const chosen = pickN(exerciseLibrary, randomInt(3, 5));
    chosen.forEach((exercise, position) => {
      rows.push({ workoutId: workout.id, exerciseId: exercise.id, position });
      meta.push({ progressionIndex: workout.progressionIndex, baseWeight: exercise.baseWeight });
    });
  }

  const inserted = await db
    .insert(workoutExercises)
    .values(rows)
    .returning({ id: workoutExercises.id });

  return inserted.map((we, i) => ({ id: we.id, ...meta[i] }));
}

async function seedSets(
  db: Db,
  seededWorkoutExercises: { id: string; progressionIndex: number; baseWeight: number | null }[],
) {
  const rows: {
    workoutExerciseId: string;
    setNumber: number;
    reps: number;
    weight: string | null;
  }[] = [];

  for (const we of seededWorkoutExercises) {
    const setCount = randomInt(3, 4);
    for (let setNumber = 1; setNumber <= setCount; setNumber++) {
      const weight =
        we.baseWeight === null
          ? null
          : (we.baseWeight + we.progressionIndex * 2.5 + randomInt(-1, 1) * 5).toFixed(2);
      rows.push({
        workoutExerciseId: we.id,
        setNumber,
        reps: randomInt(5, 12),
        weight,
      });
    }
  }

  await db.insert(sets).values(rows);
  return rows.length;
}

async function main() {
  const { db } = await import("./index");

  const exerciseLibrary = await seedExercises(db);
  const seededWorkouts = await seedWorkouts(db);
  const seededWorkoutExercises = await seedWorkoutExercises(db, seededWorkouts, exerciseLibrary);
  const setCount = await seedSets(db, seededWorkoutExercises);

  console.log(
    `Seeded ${exerciseLibrary.length} exercises, ${seededWorkouts.length} workouts, ` +
      `${seededWorkoutExercises.length} workout_exercises, ${setCount} sets for user ${USER_ID}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
