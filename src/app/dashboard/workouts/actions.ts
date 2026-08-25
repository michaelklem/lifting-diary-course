"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { createWorkout, getWorkoutById, updateWorkout } from "@/data/workouts";
import { isValidDateParam, parseDateParam } from "@/lib/date";

const workoutFormSchema = z.object({
  name: z.string().trim().max(100, { error: "Name must be 100 characters or fewer." }),
  date: z
    .string()
    .refine(isValidDateParam, { error: "Please pick a valid date." }),
});

export type WorkoutFormState = {
  errors?: { name?: string[]; date?: string[]; form?: string[] };
};

function parseForm(formData: FormData) {
  return workoutFormSchema.safeParse({
    name: formData.get("name") ?? "",
    date: formData.get("date") ?? "",
  });
}

// Puts the chosen calendar day onto an existing timestamp while preserving its
// time-of-day, so editing the date of a workout doesn't wipe out when it started.
function withDate(existing: Date, dateParam: string) {
  const day = parseDateParam(dateParam);
  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      existing.getUTCHours(),
      existing.getUTCMinutes(),
      existing.getUTCSeconds(),
    ),
  );
}

export async function createWorkoutAction(
  _prevState: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const { name, date } = parsed.data;
  const created = await createWorkout({
    name: name || null,
    startedAt: withDate(new Date(), date),
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/workouts/${created.id}`);
}

export async function updateWorkoutAction(
  workoutId: string,
  _prevState: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const existing = await getWorkoutById(workoutId);
  if (!existing) return { errors: { form: ["This workout no longer exists."] } };

  const { name, date } = parsed.data;
  const updated = await updateWorkout(workoutId, {
    name: name || null,
    startedAt: withDate(existing.startedAt, date),
  });
  if (!updated) return { errors: { form: ["Could not save the workout."] } };

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/workouts/${workoutId}`);
  redirect(`/dashboard/workouts/${workoutId}`);
}
