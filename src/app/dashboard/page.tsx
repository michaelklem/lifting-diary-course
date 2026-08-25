import Link from "next/link";
import { format } from "date-fns";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/date-picker";
import { isValidDateParam, parseDateParam, toDateParam } from "@/lib/date";
import { formatSet } from "@/lib/format";
import { getWorkoutDatesForMonth, getWorkoutsForDate } from "@/data/workouts";

function formatTime(date: Date) {
  return format(date, "h:mm a");
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const searchParams = await props.searchParams;

  const rawDate = searchParams.date;
  const dateParam =
    typeof rawDate === "string" && isValidDateParam(rawDate) ? rawDate : toDateParam(new Date());

  const rawMonth = searchParams.month;
  const monthParam =
    typeof rawMonth === "string" && isValidDateParam(rawMonth)
      ? rawMonth
      : `${dateParam.slice(0, 7)}-01`;

  const selectedDate = parseDateParam(dateParam);
  const viewedMonth = parseDateParam(monthParam);

  const workoutsForDate = await getWorkoutsForDate(selectedDate);
  const monthWorkoutDates = await getWorkoutDatesForMonth(
    viewedMonth.getUTCFullYear(),
    viewedMonth.getUTCMonth(),
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <DatePicker date={dateParam} month={monthParam} monthWorkoutDates={monthWorkoutDates} />
          <Button nativeButton={false} render={<Link href={`/dashboard/workouts/new?date=${dateParam}`} />}>
            <Plus data-icon="inline-start" />
            Add new workout
          </Button>
        </div>
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
                  <CardTitle>
                    <Link href={`/dashboard/workouts/${workout.id}`} className="hover:underline">
                      {workout.name ?? "Workout"}
                    </Link>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formatTime(workout.startedAt)}
                      {workout.completedAt
                        ? ` – ${formatTime(workout.completedAt)}`
                        : " (in progress)"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Edit workout"
                      nativeButton={false}
                      render={<Link href={`/dashboard/workouts/${workout.id}`} />}
                    >
                      <Pencil />
                    </Button>
                  </div>
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
