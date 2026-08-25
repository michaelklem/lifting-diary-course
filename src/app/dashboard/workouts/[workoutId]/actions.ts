"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { findOrCreateExercise } from "@/data/exercises";
import { addSet, deleteSet } from "@/data/sets";
import { addExerciseToWorkout, removeWorkoutExercise } from "@/data/workouts";

export type AddExerciseState = { errors?: { exerciseName?: string[]; form?: string[] } };
export type AddSetState = { errors?: { reps?: string[]; weight?: string[]; form?: string[] } };

const addExerciseSchema = z.object({
  exerciseName: z
    .string()
    .trim()
    .min(1, { error: "Choose or type an exercise." })
    .max(100, { error: "Exercise name must be 100 characters or fewer." }),
});

// Empty weight must be caught *before* coercion: z.coerce.number() turns "" into 0.
const addSetSchema = z.object({
  reps: z.coerce
    .number({ error: "Reps must be a number." })
    .int({ error: "Reps must be a whole number." })
    .min(1, { error: "Reps must be at least 1." })
    .max(1000, { error: "Reps must be 1000 or fewer." }),
  weight: z.union([
    z.literal(""),
    z.coerce
      .number({ error: "Weight must be a number." })
      .min(0, { error: "Weight can't be negative." })
      .max(9999.99, { error: "Weight must be 9999.99 or less." }),
  ]),
});

function revalidateWorkout(workoutId: string) {
  revalidatePath(`/dashboard/workouts/${workoutId}`);
  revalidatePath("/dashboard");
}

export async function addExerciseAction(
  workoutId: string,
  _prev: AddExerciseState,
  formData: FormData,
): Promise<AddExerciseState> {
  const parsed = addExerciseSchema.safeParse({ exerciseName: formData.get("exerciseName") ?? "" });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const exercise = await findOrCreateExercise(parsed.data.exerciseName);
  if (!exercise) return { errors: { form: ["Could not save the exercise."] } };

  const added = await addExerciseToWorkout(workoutId, exercise.id);
  if (!added) return { errors: { form: ["Workout not found."] } };

  revalidateWorkout(workoutId);
  return {};
}

export async function removeExerciseAction(workoutId: string, workoutExerciseId: string) {
  await removeWorkoutExercise(workoutExerciseId);
  revalidateWorkout(workoutId);
}

export async function addSetAction(
  workoutId: string,
  workoutExerciseId: string,
  _prev: AddSetState,
  formData: FormData,
): Promise<AddSetState> {
  const parsed = addSetSchema.safeParse({
    reps: formData.get("reps") ?? "",
    weight: formData.get("weight") ?? "",
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const { reps, weight } = parsed.data;
  const created = await addSet(workoutExerciseId, { reps, weight: weight === "" ? null : weight });
  if (!created) return { errors: { form: ["Exercise not found."] } };

  revalidateWorkout(workoutId);
  return {};
}

export async function deleteSetAction(workoutId: string, setId: string) {
  await deleteSet(setId);
  revalidateWorkout(workoutId);
}
