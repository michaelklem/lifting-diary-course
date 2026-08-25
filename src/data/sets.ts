import { auth } from "@clerk/nextjs/server";
import { and, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { sets, workoutExercises, workouts } from "@/db/schema";

// Resolves a workout_exercises row only if it belongs to a workout the user
// owns. Returns the parent workoutId so callers can revalidate the right page.
async function getOwnedWorkoutExercise(workoutExerciseId: string, userId: string) {
  const [row] = await db
    .select({ id: workoutExercises.id, workoutId: workoutExercises.workoutId })
    .from(workoutExercises)
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(workoutExercises.id, workoutExerciseId), eq(workouts.userId, userId)))
    .limit(1);

  return row ?? null;
}

export async function addSet(
  workoutExerciseId: string,
  input: { reps: number; weight: number | null },
) {
  const { userId } = await auth.protect();

  const owned = await getOwnedWorkoutExercise(workoutExerciseId, userId);
  if (!owned) return null;

  const [{ maxSetNumber }] = await db
    .select({ maxSetNumber: max(sets.setNumber) })
    .from(sets)
    .where(eq(sets.workoutExerciseId, workoutExerciseId));

  const [created] = await db
    .insert(sets)
    .values({
      workoutExerciseId,
      setNumber: (maxSetNumber ?? 0) + 1,
      reps: input.reps,
      // `numeric` columns round-trip as strings in Drizzle.
      weight: input.weight === null ? null : input.weight.toFixed(2),
    })
    .returning({ id: sets.id });

  return { ...created, workoutId: owned.workoutId };
}

export async function deleteSet(setId: string) {
  const { userId } = await auth.protect();

  const [owned] = await db
    .select({ id: sets.id, workoutId: workoutExercises.workoutId })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .where(and(eq(sets.id, setId), eq(workouts.userId, userId)))
    .limit(1);
  if (!owned) return null;

  await db.delete(sets).where(eq(sets.id, owned.id));

  return owned;
}
