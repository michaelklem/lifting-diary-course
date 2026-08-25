import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Trash2 } from "lucide-react";
import { AddExerciseForm } from "@/components/add-exercise-form";
import { AddSetForm } from "@/components/add-set-form";
import { WorkoutForm } from "@/components/workout-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { getExercises } from "@/data/exercises";
import { getWorkoutDetail } from "@/data/workouts";
import { toDateParam } from "@/lib/date";
import { formatSet } from "@/lib/format";
import { updateWorkoutAction } from "../actions";
import { addExerciseAction, addSetAction, deleteSetAction, removeExerciseAction } from "./actions";

export default async function WorkoutDetailPage(props: PageProps<"/dashboard/workouts/[workoutId]">) {
  const { workoutId } = await props.params;
  const [workout, exerciseOptions] = await Promise.all([getWorkoutDetail(workoutId), getExercises()]);
  if (!workout) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          nativeButton={false}
          render={<Link href={`/dashboard?date=${toDateParam(workout.startedAt)}`} />}
        >
          <ArrowLeft data-icon="inline-start" />
          Back to dashboard
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{workout.name ?? "Workout"}</h1>
          <p className="text-sm text-muted-foreground">{format(workout.startedAt, "do MMM yyyy")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workout details</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkoutForm
            action={updateWorkoutAction.bind(null, workout.id)}
            defaultValues={{ name: workout.name ?? "", date: toDateParam(workout.startedAt) }}
            submitLabel="Save details"
          />
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold tracking-tight">Exercises</h2>

      {workout.exercises.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No exercises yet</EmptyTitle>
            <EmptyDescription>Add your first exercise below to start logging sets.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-4">
          {workout.exercises.map((exercise) => (
            <li key={exercise.id}>
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
                  <CardTitle>{exercise.name}</CardTitle>
                  <form action={removeExerciseAction.bind(null, workout.id, exercise.id)}>
                    <Button
                      type="submit"
                      variant="destructive"
                      size="icon-sm"
                      aria-label={`Remove ${exercise.name}`}
                    >
                      <Trash2 />
                    </Button>
                  </form>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {exercise.sets.length > 0 && (
                    <ul className="flex flex-col gap-1">
                      {exercise.sets.map((set, index) => (
                        <li key={set.id} className="flex items-center justify-between gap-4 text-sm">
                          <span>
                            <span className="text-muted-foreground">Set {index + 1}</span>{" "}
                            <span className="font-medium">{formatSet(set)}</span>
                          </span>
                          <form action={deleteSetAction.bind(null, workout.id, set.id)}>
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Delete set ${index + 1}`}
                            >
                              <Trash2 />
                            </Button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                  {exercise.sets.length > 0 && <Separator />}
                  <AddSetForm
                    action={addSetAction.bind(null, workout.id, exercise.id)}
                    workoutExerciseId={exercise.id}
                  />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add exercise</CardTitle>
        </CardHeader>
        <CardContent>
          <AddExerciseForm
            action={addExerciseAction.bind(null, workout.id)}
            exerciseNames={exerciseOptions.map((exercise) => exercise.name)}
          />
        </CardContent>
      </Card>
    </main>
  );
}
