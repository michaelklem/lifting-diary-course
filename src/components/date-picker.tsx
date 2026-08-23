"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseLocalDateParam, toLocalDateParam } from "@/lib/date";

export function DatePicker({
  date,
  month,
  monthWorkoutDates,
}: {
  date: string;
  month: string;
  monthWorkoutDates: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const selected = parseLocalDateParam(date);
  const viewedMonth = parseLocalDateParam(month);

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
          month={viewedMonth}
          onMonthChange={(nextMonth) => {
            const nextMonthParam = toLocalDateParam(
              new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1),
            );
            router.push(`/dashboard?date=${date}&month=${nextMonthParam}`, { scroll: false });
          }}
          modifiers={{ hasWorkout: monthWorkoutDates.map(parseLocalDateParam) }}
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
