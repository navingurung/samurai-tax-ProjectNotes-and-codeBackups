```javascript
"use client";

import * as React from "react";
import {
  addMonths,
  endOfDay,
  endOfQuarter,
  format,
  isSameMonth,
  startOfDay,
  startOfQuarter,
  startOfToday,
  subDays,
} from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarIcon, Clock3 } from "lucide-react";
import { type DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateTimeRangeFilter {
  date: DateRange | undefined;
  useTime: boolean;
  fromTime: string;
  toTime: string;
}

interface FilterProps {
  value?: DateTimeRangeFilter;
  onFilterChange?: (value: DateTimeRangeFilter) => void;

  date?: DateRange | undefined;
  onDateChange?: (date: DateRange | undefined) => void;
}

const PRESETS = [
  "今日",
  "昨日",
  "過去7日間",
  "現在までの期間",
  "今四半期",
  "カスタム期間",
] as const;

type PresetType = (typeof PRESETS)[number];

const DEFAULT_FILTER: DateTimeRangeFilter = {
  date: undefined,
  useTime: false,
  fromTime: "00:00",
  toTime: "23:59",
};

const CALENDAR_START_MONTH = new Date(2020, 0);
const CALENDAR_END_MONTH = new Date(2035, 11);

function getSafeToMonth(from?: Date, to?: Date) {
  if (!from && !to) {
    return addMonths(new Date(), 1);
  }

  if (from && to) {
    return isSameMonth(from, to) ? addMonths(from, 1) : to;
  }

  if (from && !to) {
    return addMonths(from, 1);
  }

  return addMonths(to!, 1);
}

export function DatePickerWithRange(props: FilterProps) {
  const resolvedValue: DateTimeRangeFilter = props.value ?? {
    date: props.date,
    useTime: false,
    fromTime: "00:00",
    toTime: "23:59",
  };

  const [open, setOpen] = React.useState(false);

  const [selectedDate, setSelectedDate] = React.useState<DateRange | undefined>(
    resolvedValue.date,
  );
  const [activePreset, setActivePreset] =
    React.useState<PresetType>("カスタム期間");

  const [showTime, setShowTime] = React.useState(resolvedValue.useTime);
  const [fromTime, setFromTime] = React.useState(
    resolvedValue.fromTime || "00:00",
  );
  const [toTime, setToTime] = React.useState(resolvedValue.toTime || "23:59");

  const [fromMonth, setFromMonth] = React.useState<Date>(
    resolvedValue.date?.from ?? new Date(),
  );
  const [toMonth, setToMonth] = React.useState<Date>(
    getSafeToMonth(resolvedValue.date?.from, resolvedValue.date?.to),
  );

  const [calendarResetKey, setCalendarResetKey] = React.useState(0);

  React.useEffect(() => {
    const nextValue: DateTimeRangeFilter = props.value ?? {
      date: props.date,
      useTime: false,
      fromTime: "00:00",
      toTime: "23:59",
    };

    setSelectedDate(nextValue.date);
    setShowTime(nextValue.useTime);
    setFromTime(nextValue.fromTime || "00:00");
    setToTime(nextValue.toTime || "23:59");

    const nextFrom = nextValue.date?.from ?? new Date();
    setFromMonth(nextFrom);
    setToMonth(getSafeToMonth(nextValue.date?.from, nextValue.date?.to));
  }, [props.value, props.date]);

  const formatDate = (d?: Date) => {
    if (!d) return "";
    return format(d, "yyyy/MM/dd", { locale: ja });
  };

  // TODO:
  // Parent(main page / table task) 側で value / onFilterChange に切り替えたら、
  // date + time の両方で datatable filter を適用する。
  const emitChange = (nextFilter: DateTimeRangeFilter) => {
    props.onFilterChange?.(nextFilter);
    props.onDateChange?.(nextFilter.date);
  };

  const setRangeAndMonths = (range: DateRange | undefined) => {
    setSelectedDate(range);

    const nextFrom = range?.from ?? new Date();
    setFromMonth(nextFrom);
    setToMonth(getSafeToMonth(range?.from, range?.to));
  };

  const applyPreset = (preset: PresetType) => {
    const today = new Date();

    switch (preset) {
      case "今日": {
        const from = startOfToday();
        const to = endOfDay(today);
        setRangeAndMonths({ from, to });
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "昨日": {
        const yesterday = subDays(today, 1);
        const from = startOfDay(yesterday);
        const to = endOfDay(yesterday);
        setRangeAndMonths({ from, to });
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "過去7日間": {
        const from = subDays(startOfToday(), 6);
        const to = endOfDay(today);
        setRangeAndMonths({ from, to });
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "現在までの期間": {
        const from = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0);
        const to = endOfDay(today);
        setRangeAndMonths({ from, to });
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "今四半期": {
        const from = startOfQuarter(today);
        const to = endOfQuarter(today);
        setRangeAndMonths({ from, to });
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "カスタム期間": {
        break;
      }
    }

    setActivePreset(preset);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setSelectedDate(range);
    setActivePreset("カスタム期間");

    if (range?.from) {
      setFromMonth(range.from);
    }

    if (range?.to) {
      setToMonth(getSafeToMonth(range.from, range.to));
    } else if (range?.from) {
      setToMonth(addMonths(range.from, 1));
    }
  };

  const handleApply = () => {
    emitChange({
      date: selectedDate,
      useTime: showTime,
      fromTime,
      toTime,
    });
    setOpen(false);
  };

  const handleClear = () => {
    const today = new Date();
    const from = startOfDay(today);
    const to = endOfDay(today);

    setSelectedDate({ from, to });
    setActivePreset("今日");
    setShowTime(false);
    setFromTime("00:00");
    setToTime("23:59");
    setFromMonth(from);
    setToMonth(addMonths(from, 1));
    setCalendarResetKey((prev) => prev + 1);

    emitChange({
      date: { from, to },
      useTime: false,
      fromTime: "00:00",
      toTime: "23:59",
    });
  };

  return (
    <Field>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date-picker-range"
            className="justify-start px-2.5 font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />

            {resolvedValue.date?.from ? (
              resolvedValue.date.to ? (
                <>
                  {format(resolvedValue.date.from, "yyyy/MM/dd")} -{" "}
                  {format(resolvedValue.date.to, "yyyy/MM/dd")}
                  {resolvedValue.useTime
                    ? ` ${resolvedValue.fromTime} - ${resolvedValue.toTime}`
                    : ""}
                </>
              ) : (
                <>
                  {format(resolvedValue.date.from, "yyyy/MM/dd")}
                  {resolvedValue.useTime ? ` ${resolvedValue.fromTime}` : ""}
                </>
              )
            ) : (
              <span>期間を選択</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[860px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl p-0"
        >
          <div className="grid min-w-0 grid-cols-[138px_minmax(0,1fr)]">
            <aside className="border-r bg-muted/20 p-2.5">
              <div className="space-y-1">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={[
                      "w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                      activePreset === preset
                        ? "bg-accent text-accent-foreground font-medium"
                        : "hover:bg-muted",
                    ].join(" ")}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </aside>

            <div className="min-w-0">
              {/* Top controls */}
              <div className="border-b p-2.5">
                <div className="mx-auto max-w-[640px] space-y-2">
                  {/* Date row */}
                  <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                    <Input
                      value={formatDate(selectedDate?.from)}
                      readOnly
                      placeholder="開始日"
                      className="h-9"
                    />

                    <div className="text-muted-foreground">→</div>

                    <Input
                      value={formatDate(selectedDate?.to)}
                      readOnly
                      placeholder="終了日"
                      className="h-9"
                    />

                    <Button
                      type="button"
                      variant={showTime ? "default" : "outline"}
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setShowTime((prev) => !prev)}
                    >
                      <Clock3 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Time row */}
                  {showTime && (
                    <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                      <Input
                        type="time"
                        value={fromTime}
                        onChange={(e) => setFromTime(e.target.value)}
                        className="h-9"
                      />

                      <div className="text-muted-foreground">→</div>

                      <Input
                        type="time"
                        value={toTime}
                        onChange={(e) => setToTime(e.target.value)}
                        className="h-9"
                      />

                      {/* keep spacing aligned with clock button */}
                      <div className="w-9" />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-2.5">
                <div className="grid min-w-0 grid-cols-2 gap-2.5">
                  <div className="rounded-lg border p-1.5">
                    <Calendar
                      key={`from-${calendarResetKey}`}
                      mode="range"
                      selected={selectedDate}
                      onSelect={handleCalendarSelect}
                      month={fromMonth}
                      onMonthChange={setFromMonth}
                      numberOfMonths={1}
                      captionLayout="dropdown"
                      startMonth={CALENDAR_START_MONTH}
                      endMonth={CALENDAR_END_MONTH}
                      className="w-full"
                    />
                  </div>

                  <div className="rounded-lg border p-1.5">
                    <Calendar
                      key={`to-${calendarResetKey}`}
                      mode="range"
                      selected={selectedDate}
                      onSelect={handleCalendarSelect}
                      month={toMonth}
                      onMonthChange={setToMonth}
                      numberOfMonths={1}
                      captionLayout="dropdown"
                      startMonth={CALENDAR_START_MONTH}
                      endMonth={CALENDAR_END_MONTH}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t p-2.5">
                <Button size="sm" variant="outline" onClick={handleClear}>
                  クリア
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDate(resolvedValue.date);
                      setShowTime(resolvedValue.useTime);
                      setFromTime(resolvedValue.fromTime || "00:00");
                      setToTime(resolvedValue.toTime || "23:59");

                      const nextFrom = resolvedValue.date?.from ?? new Date();
                      setFromMonth(nextFrom);
                      setToMonth(
                        getSafeToMonth(
                          resolvedValue.date?.from,
                          resolvedValue.date?.to,
                        ),
                      );

                      setCalendarResetKey((prev) => prev + 1);
                      setOpen(false);
                    }}
                  >
                    キャンセル
                  </Button>

                  <Button size="sm" onClick={handleApply}>
                    適用
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

```
