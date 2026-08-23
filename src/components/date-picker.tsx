"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseLocalDateParam, toLocalDateParam } from "@/lib/date";
import { getWorkoutDatesForMonth } from "@/app/dashboard/actions";

export function DatePicker({
  date,
  initialMonthWorkoutDates,
}: {
  date: string;
  initialMonthWorkoutDates: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const selected = parseLocalDateParam(date);
  const [prevDate, setPrevDate] = useState(date);
  const [month, setMonth] = useState(selected);
  const [workoutDates, setWorkoutDates] = useState(
    initialMonthWorkoutDates.map(parseLocalDateParam),
  );

  if (date !== prevDate) {
    setPrevDate(date);
    setMonth(selected);
    setWorkoutDates(initialMonthWorkoutDates.map(parseLocalDateParam));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline">
            <CalendarIcon />
            {format(selected, "do MMM yyyy")}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          month={month}
          onMonthChange={async (nextMonth) => {
            setMonth(nextMonth);
            const dates = await getWorkoutDatesForMonth(nextMonth.getFullYear(), nextMonth.getMonth());
            setWorkoutDates(dates.map(parseLocalDateParam));
          }}
          modifiers={{ hasWorkout: workoutDates }}
          modifiersClassNames={{ hasWorkout: "border border-[#ccc]" }}
          onSelect={(value) => {
            if (!value) return;
            setOpen(false);
            router.push(`/dashboard?date=${toLocalDateParam(value)}`);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
