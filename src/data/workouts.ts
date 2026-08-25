import { auth } from "@clerk/nextjs/server";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { exercises, sets, workoutExercises, workouts } from "@/db/schema";
import { toDateParam } from "@/lib/date";

type ExerciseWithSets = {
  id: string;
  name: string;
  sets: { id: string; setNumber: number; reps: number; weight: string | null }[];
};

export async function getWorkoutDatesForMonth(year: number, month: number): Promise<string[]> {
  const { userId } = await auth.protect();

  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));

  const rows = await db
    .select({ startedAt: workouts.startedAt })
    .from(workouts)
    .where(and(eq(workouts.userId, userId), gte(workouts.startedAt, start), lt(workouts.startedAt, end)));

  return [...new Set(rows.map((row) => toDateParam(row.startedAt)))];
}

export async function getWorkoutsForDate(date: Date) {
  const { userId } = await auth.protect();

  const startOfDay = date;
  const endOfDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);

  const dayWorkouts = await db
    .select({
      id: workouts.id,
      name: workouts.name,
      startedAt: workouts.startedAt,
      completedAt: workouts.completedAt,
    })
    .from(workouts)
    .where(
      and(
        eq(workouts.userId, userId),
        gte(workouts.startedAt, startOfDay),
        lt(workouts.startedAt, endOfDay),
      ),
    )
    .orderBy(asc(workouts.startedAt));

  if (dayWorkouts.length === 0) return [];

  const workoutIds = dayWorkouts.map((w) => w.id);

  const exerciseRows = await db
    .select({
      id: workoutExercises.id,
      workoutId: workoutExercises.workoutId,
      name: exercises.name,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(inArray(workoutExercises.workoutId, workoutIds))
    .orderBy(asc(workoutExercises.position));

  const workoutExerciseIds = exerciseRows.map((row) => row.id);

  const setRows = workoutExerciseIds.length
    ? await db
        .select({
          id: sets.id,
          workoutExerciseId: sets.workoutExerciseId,
          setNumber: sets.setNumber,
          reps: sets.reps,
          weight: sets.weight,
        })
        .from(sets)
        .where(inArray(sets.workoutExerciseId, workoutExerciseIds))
        .orderBy(asc(sets.setNumber))
    : [];

  const setsByExercise = new Map<string, typeof setRows>();
  for (const set of setRows) {
    const list = setsByExercise.get(set.workoutExerciseId) ?? [];
    list.push(set);
    setsByExercise.set(set.workoutExerciseId, list);
  }

  const exercisesByWorkout = new Map<string, ExerciseWithSets[]>();
  for (const row of exerciseRows) {
    const list = exercisesByWorkout.get(row.workoutId) ?? [];
    list.push({ id: row.id, name: row.name, sets: setsByExercise.get(row.id) ?? [] });
    exercisesByWorkout.set(row.workoutId, list);
  }

  return dayWorkouts.map((workout) => ({
    ...workout,
    exercises: exercisesByWorkout.get(workout.id) ?? [],
  }));
}

export async function getWorkoutById(id: string) {
  const { userId } = await auth.protect();

  const [workout] = await db
    .select({
      id: workouts.id,
      name: workouts.name,
      startedAt: workouts.startedAt,
      completedAt: workouts.completedAt,
    })
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, userId)))
    .limit(1);

  return workout ?? null;
}

export async function createWorkout(input: { name: string | null; startedAt: Date }) {
  const { userId } = await auth.protect();

  const [created] = await db
    .insert(workouts)
    .values({ userId, name: input.name, startedAt: input.startedAt })
    .returning({ id: workouts.id, startedAt: workouts.startedAt });

  return created;
}

export async function updateWorkout(id: string, input: { name: string | null; startedAt: Date }) {
  const { userId } = await auth.protect();

  const [updated] = await db
    .update(workouts)
    .set({ name: input.name, startedAt: input.startedAt, updatedAt: new Date() })
    .where(and(eq(workouts.id, id), eq(workouts.userId, userId)))
    .returning({ id: workouts.id, startedAt: workouts.startedAt });

  return updated ?? null;
}
