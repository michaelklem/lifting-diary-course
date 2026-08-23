import { auth } from "@clerk/nextjs/server";
import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import { exercises, sets, workoutExercises, workouts } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/date-picker";
import { isValidDateParam, parseDateParam, toDateParam } from "@/lib/date";

type ExerciseWithSets = {
  id: string;
  name: string;
  sets: { id: string; setNumber: number; reps: number; weight: string | null }[];
};

async function getWorkoutsForDate(userId: string, date: Date) {
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

function formatTime(date: Date) {
  return format(date, "h:mm a");
}

function formatSet(set: { reps: number; weight: string | null }) {
  return set.weight ? `${set.reps} × ${Number(set.weight)} lb` : `${set.reps} reps`;
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const { userId } = await auth.protect();

  const rawDate = (await props.searchParams).date;
  const dateParam =
    typeof rawDate === "string" && isValidDateParam(rawDate) ? rawDate : toDateParam(new Date());

  const workoutsForDate = await getWorkoutsForDate(userId, parseDateParam(dateParam));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <DatePicker date={dateParam} />
      </div>

      {workoutsForDate.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No workouts logged for this date.
          </CardContent>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {workoutsForDate.map((workout) => (
            <li key={workout.id}>
              <Card>
                <CardHeader className="flex-row items-baseline justify-between gap-4 space-y-0">
                  <CardTitle>{workout.name ?? "Workout"}</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(workout.startedAt)}
                    {workout.completedAt
                      ? ` – ${formatTime(workout.completedAt)}`
                      : " (in progress)"}
                  </span>
                </CardHeader>

                {workout.exercises.length > 0 && (
                  <CardContent>
                    <ul className="flex flex-col gap-2">
                      {workout.exercises.map((exercise) => (
                        <li key={exercise.id} className="text-sm">
                          <span className="font-medium">{exercise.name}</span>{" "}
                          <span className="text-muted-foreground">
                            {exercise.sets.map(formatSet).join(", ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
