import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkoutForm } from "@/components/workout-form";
import { isValidDateParam, toDateParam } from "@/lib/date";
import { createWorkoutAction } from "../actions";

export default async function NewWorkoutPage(props: PageProps<"/dashboard/workouts/new">) {
  const searchParams = await props.searchParams;
  const rawDate = searchParams.date;
  const date =
    typeof rawDate === "string" && isValidDateParam(rawDate) ? rawDate : toDateParam(new Date());

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Add new workout</h1>
      <Card>
        <CardHeader>
          <CardTitle>Workout details</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkoutForm
            action={createWorkoutAction}
            defaultValues={{ name: "", date }}
            submitLabel="Create workout"
          />
        </CardContent>
      </Card>
    </main>
  );
}
