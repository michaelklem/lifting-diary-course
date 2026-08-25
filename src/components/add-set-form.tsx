"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AddSetState } from "@/app/dashboard/workouts/[workoutId]/actions";

export function AddSetForm({
  action,
  workoutExerciseId,
}: {
  action: (state: AddSetState, formData: FormData) => Promise<AddSetState>;
  workoutExerciseId: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  // A fresh state object with no errors means the last submit succeeded.
  useEffect(() => {
    if (!state.errors) formRef.current?.reset();
  }, [state]);

  const repsErrors = state.errors?.reps?.map((message) => ({ message }));
  const weightErrors = state.errors?.weight?.map((message) => ({ message }));
  const formErrors = state.errors?.form?.map((message) => ({ message }));

  const repsId = `reps-${workoutExerciseId}`;
  const weightId = `weight-${workoutExerciseId}`;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <Field className="w-24" data-invalid={repsErrors ? true : undefined}>
          <FieldLabel htmlFor={repsId}>Reps</FieldLabel>
          <Input
            id={repsId}
            name="reps"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            placeholder="8"
            required
            aria-invalid={repsErrors ? true : undefined}
          />
        </Field>
        <Field className="w-32" data-invalid={weightErrors ? true : undefined}>
          <FieldLabel htmlFor={weightId}>Weight (lb)</FieldLabel>
          <Input
            id={weightId}
            name="weight"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.5}
            placeholder="optional"
            aria-invalid={weightErrors ? true : undefined}
          />
        </Field>
        <Button type="submit" variant="outline" disabled={pending}>
          <Plus data-icon="inline-start" />
          {pending ? "Adding…" : "Add set"}
        </Button>
      </div>
      <FieldError errors={repsErrors} />
      <FieldError errors={weightErrors} />
      <FieldError errors={formErrors} />
    </form>
  );
}
