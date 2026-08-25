"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import type { AddExerciseState } from "@/app/dashboard/workouts/[workoutId]/actions";

export function AddExerciseForm({
  action,
  exerciseNames,
}: {
  action: (state: AddExerciseState, formData: FormData) => Promise<AddExerciseState>;
  exerciseNames: string[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [inputValue, setInputValue] = useState("");

  const nameErrors = state.errors?.exerciseName?.map((message) => ({ message }));
  const formErrors = state.errors?.form?.map((message) => ({ message }));

  return (
    <form
      action={(formData) => {
        setInputValue("");
        formAction(formData);
      }}
      className="flex flex-col gap-3"
    >
      <Field data-invalid={nameErrors ? true : undefined}>
        <FieldLabel htmlFor="exercise-name">Exercise</FieldLabel>
        <div className="flex items-start gap-2">
          <Combobox
            items={exerciseNames}
            inputValue={inputValue}
            onInputValueChange={setInputValue}
            onValueChange={(value) => setInputValue(typeof value === "string" ? value : "")}
          >
            <ComboboxInput
              id="exercise-name"
              name="exerciseName"
              placeholder="Search or type a new exercise…"
              className="flex-1"
              aria-invalid={nameErrors ? true : undefined}
            />
            <ComboboxContent>
              <ComboboxEmpty>
                {inputValue.trim() ? `Press Add to create “${inputValue.trim()}”` : "No exercises found."}
              </ComboboxEmpty>
              <ComboboxList>
                {(name: string) => (
                  <ComboboxItem key={name} value={name}>
                    {name}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <Button type="submit" disabled={pending}>
            <Plus data-icon="inline-start" />
            {pending ? "Adding…" : "Add"}
          </Button>
        </div>
        <FieldError errors={nameErrors} />
      </Field>
      <FieldError errors={formErrors} />
    </form>
  );
}
