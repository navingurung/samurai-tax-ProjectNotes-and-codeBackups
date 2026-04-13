```javascript
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";

interface FilterProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
}

export function DatePickerWithRange({ date, onDateChange }: FilterProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<DateRange | undefined>(
    date,
  );

  React.useEffect(() => {
    setSelectedDate(date);
  }, [date]);

  return (
    <Field>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date-picker-range"
            className="justify-start px-2.5 font-normal"
          >
            <CalendarIcon />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={selectedDate}
            onSelect={setSelectedDate}
            numberOfMonths={2}
          />
          <div className="flex justify-between border-t p-2">
            <Button
            size="sm"
            className="m-2"
            variant="outline"
            onClick={() => {
              const today = new Date();
              setSelectedDate({ from: today, to: today });
            }}>
              今日
            </Button>
            <div>
              <Button
              variant="ghost"
              size="sm"
              className="m-2"
              onClick={() => {
                setOpen(false);
                setSelectedDate(date);
              }}
            >
              キャンセル
            </Button>
            <Button
              size="sm"
              className="m-2"
              onClick={() => {
                try {
                  onDateChange(selectedDate);
                } catch (e) {
                  console.error("Error applying date range:", e);
                } finally {
                  setOpen(false);
                }
              }}
            >
              適用
            </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

```
