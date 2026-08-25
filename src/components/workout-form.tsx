"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseLocalDateParam, toLocalDateParam } from "@/lib/date";
import type { WorkoutFormState } from "@/app/dashboard/workouts/actions";

export function WorkoutForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (state: WorkoutFormState, formData: FormData) => Promise<WorkoutFormState>;
  defaultValues: { name: string; date: string };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [date, setDate] = useState(defaultValues.date);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const nameErrors = state.errors?.name?.map((message) => ({ message }));
  const dateErrors = state.errors?.date?.map((message) => ({ message }));
  const formErrors = state.errors?.form?.map((message) => ({ message }));

  return (
    <form action={formAction}>
      <FieldGroup>
        <Field data-invalid={nameErrors ? true : undefined}>
          <FieldLabel htmlFor="workout-name">Name</FieldLabel>
          <Input
            id="workout-name"
            name="name"
            defaultValue={defaultValues.name}
            placeholder="e.g. Push day"
            aria-invalid={nameErrors ? true : undefined}
          />
          <FieldError errors={nameErrors} />
        </Field>

        <Field data-invalid={dateErrors ? true : undefined}>
          <FieldLabel htmlFor="workout-date">Date</FieldLabel>
          <input type="hidden" name="date" value={date} />
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              render={
                <Button id="workout-date" type="button" variant="outline" className="w-fit">
                  <CalendarIcon />
                  {format(parseLocalDateParam(date), "do MMM yyyy")}
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseLocalDateParam(date)}
                defaultMonth={parseLocalDateParam(date)}
                onSelect={(value) => {
                  if (!value) return;
                  setDate(toLocalDateParam(value));
                  setCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          <FieldError errors={dateErrors} />
        </Field>

        <FieldError errors={formErrors} />

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : submitLabel}
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link href="/dashboard" />}>
            Cancel
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
