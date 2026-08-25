import { auth } from "@clerk/nextjs/server";
import { and, asc, eq, gte, inArray, lt, max } from "drizzle-orm";
import { db } from "@/db";
import { exercises, sets, workoutExercises, workouts } from "@/db/schema";
import { toDateParam } from "@/lib/date";

export type ExerciseWithSets = {
  id: string;
  exerciseId: string;
  name: string;
  sets: { id: string; setNumber: number; reps: number; weight: string | null }[];
};

// Loads the exercises (in position order) and their sets (in set order) for a
// list of workout IDs. Callers must only pass IDs that came from an
// ownership-scoped query — this helper does not re-check userId itself.
async function hydrateExercises(workoutIds: string[]): Promise<Map<string, ExerciseWithSets[]>> {
  const exercisesByWorkout = new Map<string, ExerciseWithSets[]>();
  if (workoutIds.length === 0) return exercisesByWorkout;

  const exerciseRows = await db
    .select({
      id: workoutExercises.id,
      workoutId: workoutExercises.workoutId,
      exerciseId: workoutExercises.exerciseId,
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

  for (const row of exerciseRows) {
    const list = exercisesByWorkout.get(row.workoutId) ?? [];
    list.push({
      id: row.id,
      exerciseId: row.exerciseId,
      name: row.name,
      sets: setsByExercise.get(row.id) ?? [],
    });
    exercisesByWorkout.set(row.workoutId, list);
  }

  return exercisesByWorkout;
}

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

  const exercisesByWorkout = await hydrateExercises(dayWorkouts.map((w) => w.id));

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

export async function getWorkoutDetail(id: string) {
  const workout = await getWorkoutById(id);
  if (!workout) return null;

  const exercisesByWorkout = await hydrateExercises([workout.id]);
  return { ...workout, exercises: exercisesByWorkout.get(workout.id) ?? [] };
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

// Appends an exercise to the end of a workout. neon-http has no transactions,
// so the ownership check, max(position) read and insert run as separate
// statements; a concurrent double-submit can collide on UNIQUE(workoutId,
// position), which we handle by retrying once.
export async function addExerciseToWorkout(workoutId: string, exerciseId: string) {
  const { userId } = await auth.protect();

  const [owned] = await db
    .select({ id: workouts.id })
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .limit(1);
  if (!owned) return null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const [{ maxPosition }] = await db
      .select({ maxPosition: max(workoutExercises.position) })
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, workoutId));

    try {
      const [created] = await db
        .insert(workoutExercises)
        .values({ workoutId, exerciseId, position: (maxPosition ?? -1) + 1 })
        .returning({ id: workoutExercises.id });
      return created;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }

  return null;
}

export async function removeWorkoutExercise(workoutExerciseId: string) {
  const { userId } = await auth.protect();

  const ownedWorkoutIds = db
    .select({ id: workouts.id })
    .from(workouts)
    .where(eq(workouts.userId, userId));

  const [deleted] = await db
    .delete(workoutExercises)
    .where(
      and(
        eq(workoutExercises.id, workoutExerciseId),
        inArray(workoutExercises.workoutId, ownedWorkoutIds),
      ),
    )
    .returning({ id: workoutExercises.id, workoutId: workoutExercises.workoutId });

  return deleted ?? null;
}
