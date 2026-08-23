"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { parseLocalDateParam, toLocalDateParam } from "@/lib/date";

export function DatePicker({ date }: { date: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const selected = parseLocalDateParam(date);

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
