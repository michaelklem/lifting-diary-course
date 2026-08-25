import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkoutForm } from "@/components/workout-form";
import { getWorkoutById } from "@/data/workouts";
import { toDateParam } from "@/lib/date";
import { updateWorkoutAction } from "../../actions";

export default async function EditWorkoutPage(props: PageProps<"/dashboard/workouts/[id]/edit">) {
  const { id } = await props.params;
  const workout = await getWorkoutById(id);
  if (!workout) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Edit workout</h1>
      <Card>
        <CardHeader>
          <CardTitle>Workout details</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkoutForm
            action={updateWorkoutAction.bind(null, workout.id)}
            defaultValues={{ name: workout.name ?? "", date: toDateParam(workout.startedAt) }}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </main>
  );
}
