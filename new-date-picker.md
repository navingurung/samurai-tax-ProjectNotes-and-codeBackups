```javascript
"use client";

import * as React from "react";
import {
  addMonths,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  isAfter,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfToday,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subQuarters,
  subWeeks,
  subYears,
} from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
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

type PresetType =
  | "today"
  | "yesterday"
  | "last30Minutes"
  | "last12Hours"
  | "last7Days"
  | "last30Days"
  | "last90Days"
  | "last365Days"
  | "lastWeek"
  | "lastMonth"
  | "previousQuarter"
  | "last12Months"
  | "lastYear"
  | "weekToDate"
  | "monthToDate"
  | "quarterToDate"
  | "yearToDate"
  | "custom";

type MenuType = "root" | "past" | "current";

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

function getMenuFromPreset(preset: PresetType): MenuType {
  if (
    [
      "last30Minutes",
      "last12Hours",
      "last7Days",
      "last30Days",
      "last90Days",
      "last365Days",
      "lastWeek",
      "lastMonth",
      "previousQuarter",
      "last12Months",
      "lastYear",
    ].includes(preset)
  ) {
    return "past";
  }

  if (
    ["weekToDate", "monthToDate", "quarterToDate", "yearToDate"].includes(
      preset,
    )
  ) {
    return "current";
  }

  return "root";
}

function SidebarButton({
  children,
  active = false,
  onClick,
  withArrow = false,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  withArrow?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors",
        active
          ? "bg-accent font-medium text-accent-foreground"
          : "hover:bg-muted",
      ].join(" ")}
    >
      <span>{children}</span>
      {withArrow ? <ChevronRight className="h-4 w-4 shrink-0" /> : null}
    </button>
  );
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
  const [activePreset, setActivePreset] = React.useState<PresetType>("custom");
  const [activeMenu, setActiveMenu] = React.useState<MenuType>("root");

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
  const [error, setError] = React.useState<string | null>(null);

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
    setError(null);
  }, [props.value, props.date]);

  const formatDate = (d?: Date) => {
    if (!d) return "";
    return format(d, "yyyy年M月d日", { locale: ja });
  };

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

  const validateRange = (range: DateRange | undefined) => {
    if (range?.from && range?.to && isAfter(range.from, range.to)) {
      setError("開始日は終了日より前である必要があります。");
      return false;
    }

    setError(null);
    return true;
  };

  const calendarOrderError =
    fromMonth.getTime() >= toMonth.getTime()
      ? "左のカレンダーは右のカレンダーより前の月である必要があります。"
      : null;

  const applyPreset = (preset: PresetType) => {
    const now = new Date();
    const today = new Date();

    switch (preset) {
      case "today": {
        const from = startOfToday();
        const to = endOfDay(today);
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "yesterday": {
        const yesterday = subDays(today, 1);
        const from = startOfDay(yesterday);
        const to = endOfDay(yesterday);
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "last30Minutes": {
        const to = now;
        const from = new Date(now.getTime() - 30 * 60 * 1000);
        setRangeAndMonths({ from, to });
        setShowTime(true);
        setFromTime(format(from, "HH:mm"));
        setToTime(format(to, "HH:mm"));
        break;
      }

      case "last12Hours": {
        const to = now;
        const from = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        setRangeAndMonths({ from, to });
        setShowTime(true);
        setFromTime(format(from, "HH:mm"));
        setToTime(format(to, "HH:mm"));
        break;
      }

      case "last7Days": {
        const from = subDays(startOfToday(), 6);
        const to = endOfDay(today);
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "last30Days": {
        const from = subDays(startOfToday(), 29);
        const to = endOfDay(today);
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "last90Days": {
        const from = subDays(startOfToday(), 89);
        const to = endOfDay(today);
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "last365Days": {
        const from = subDays(startOfToday(), 364);
        const to = endOfDay(today);
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "lastWeek": {
        const previousWeek = subWeeks(today, 1);
        const from = startOfWeek(previousWeek, { locale: ja });
        const to = endOfWeek(previousWeek, { locale: ja });
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "lastMonth": {
        const previousMonth = subMonths(today, 1);
        const from = startOfMonth(previousMonth);
        const to = endOfMonth(previousMonth);
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "previousQuarter": {
        const previousQuarter = subQuarters(today, 1);
        const from = startOfQuarter(previousQuarter);
        const to = endOfQuarter(previousQuarter);
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "last12Months": {
        const from = startOfDay(subMonths(today, 12));
        const to = endOfDay(today);
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "lastYear": {
        const previousYear = subYears(today, 1);
        const from = startOfYear(previousYear);
        const to = endOfYear(previousYear);
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "weekToDate": {
        const from = startOfWeek(today, { locale: ja });
        const to = endOfDay(today);
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "monthToDate": {
        const from = startOfMonth(today);
        const to = endOfDay(today);
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "quarterToDate": {
        const from = startOfQuarter(today);
        const to = endOfDay(today);
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "yearToDate": {
        const from = startOfYear(today);
        const to = endOfDay(today);
        setRangeAndMonths({ from, to });
        setShowTime(false);
        setFromTime("00:00");
        setToTime("23:59");
        break;
      }

      case "custom": {
        break;
      }
    }

    setActivePreset(preset);
    setActiveMenu(getMenuFromPreset(preset));
    setError(null);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setSelectedDate(range);
    setActivePreset("custom");
    setActiveMenu("root");

    validateRange(range);

    if (range?.from) {
      setFromMonth(range.from);
    }

    if (range?.to) {
      setToMonth(getSafeToMonth(range.from, range.to));
    } else if (range?.from) {
      setToMonth(addMonths(range.from, 1));
    }
  };

  // keep left calendar always before right calendar
  const handleFromMonthChange = (month: Date) => {
    setFromMonth(month);

    if (month.getTime() >= toMonth.getTime()) {
      setToMonth(addMonths(month, 1));
    }
  };

  // keep right calendar always after left calendar
  const handleToMonthChange = (month: Date) => {
    setToMonth(month);

    if (month.getTime() <= fromMonth.getTime()) {
      setFromMonth(addMonths(month, -1));
    }
  };

  const handleApply = () => {
    if (calendarOrderError) {
      setError(calendarOrderError);
      return;
    }

    if (!validateRange(selectedDate)) {
      return;
    }

    setError(null);

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
    setActivePreset("today");
    setActiveMenu("root");
    setShowTime(false);
    setFromTime("00:00");
    setToTime("23:59");
    setFromMonth(from);
    setToMonth(addMonths(from, 1));
    setCalendarResetKey((prev) => prev + 1);
    setError(null);

    emitChange({
      date: { from, to },
      useTime: false,
      fromTime: "00:00",
      toTime: "23:59",
    });
  };

  const handleCancel = () => {
    setSelectedDate(resolvedValue.date);
    setShowTime(resolvedValue.useTime);
    setFromTime(resolvedValue.fromTime || "00:00");
    setToTime(resolvedValue.toTime || "23:59");

    const nextFrom = resolvedValue.date?.from ?? new Date();
    setFromMonth(nextFrom);
    setToMonth(
      getSafeToMonth(resolvedValue.date?.from, resolvedValue.date?.to),
    );

    setCalendarResetKey((prev) => prev + 1);
    setError(null);
    setOpen(false);
  };

  return (
    <Field>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            setActiveMenu(getMenuFromPreset(activePreset));
          }
        }}
      >
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
          className="w-[980px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl p-0"
        >
          <div className="grid min-w-0 grid-cols-[220px_minmax(0,1fr)]">
            <aside className="border-r bg-muted/20 p-2.5">
              {activeMenu === "root" && (
                <div className="space-y-1">
                  <SidebarButton
                    active={activePreset === "today"}
                    onClick={() => applyPreset("today")}
                  >
                    今日
                  </SidebarButton>

                  <SidebarButton
                    active={activePreset === "yesterday"}
                    onClick={() => applyPreset("yesterday")}
                  >
                    昨日
                  </SidebarButton>

                  <SidebarButton
                    onClick={() => setActiveMenu("past")}
                    withArrow
                  >
                    過去
                  </SidebarButton>

                  <SidebarButton
                    onClick={() => setActiveMenu("current")}
                    withArrow
                  >
                    現在までの期間
                  </SidebarButton>

                  <SidebarButton
                    active={activePreset === "custom"}
                    onClick={() => applyPreset("custom")}
                  >
                    カスタム期間
                  </SidebarButton>
                </div>
              )}

              {activeMenu === "past" && (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setActiveMenu("root")}
                    className="mb-2 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    過去
                  </button>

                  <SidebarButton
                    active={activePreset === "last30Minutes"}
                    onClick={() => applyPreset("last30Minutes")}
                  >
                    過去30分間
                  </SidebarButton>

                  <SidebarButton
                    active={activePreset === "last12Hours"}
                    onClick={() => applyPreset("last12Hours")}
                  >
                    過去12時間
                  </SidebarButton>

                  <SidebarButton
                    active={activePreset === "last7Days"}
                    onClick={() => applyPreset("last7Days")}
                  >
                    過去7日間
                  </SidebarButton>

                  <SidebarButton
                    active={activePreset === "last30Days"}
                    onClick={() => applyPreset("last30Days")}
                  >
                    過去30日間
                  </SidebarButton>

                  <SidebarButton
                    active={activePreset === "last90Days"}
                    onClick={() => applyPreset("last90Days")}
                  >
                    過去90日間
                  </SidebarButton>

                  <SidebarButton
                    active={activePreset === "last365Days"}
                    onClick={() => applyPreset("last365Days")}
                  >
                    過去365日間
                  </SidebarButton>

                  <div className="my-2 border-t" />

                  <SidebarButton
                    active={activePreset === "lastWeek"}
                    onClick={() => applyPreset("lastWeek")}
                  >
                    先週
                  </SidebarButton>

                  <SidebarButton
                    active={activePreset === "lastMonth"}
                    onClick={() => applyPreset("lastMonth")}
                  >
                    先月
                  </SidebarButton>

                  <SidebarButton
                    active={activePreset === "previousQuarter"}
                    onClick={() => applyPreset("previousQuarter")}
                  >
                    前四半期
                  </SidebarButton>

                  <SidebarButton
                    active={activePreset === "last12Months"}
                    onClick={() => applyPreset("last12Months")}
                  >
                    過去12か月
                  </SidebarButton>

                  <SidebarButton
                    active={activePreset === "lastYear"}
                    onClick={() => applyPreset("lastYear")}
                  >
                    昨年
                  </SidebarButton>
                </div>
              )}

              {activeMenu === "current" && (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setActiveMenu("root")}
                    className="mb-2 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium hover:bg-muted"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    現在までの期間
                  </button>

                  <SidebarButton
                    active={activePreset === "weekToDate"}
                    onClick={() => applyPreset("weekToDate")}
                  >
                    週の初めから今日まで
                  </SidebarButton>

                  <SidebarButton
                    active={activePreset === "monthToDate"}
                    onClick={() => applyPreset("monthToDate")}
                  >
                    月の初めから今日まで
                  </SidebarButton>

                  <SidebarButton
                    active={activePreset === "quarterToDate"}
                    onClick={() => applyPreset("quarterToDate")}
                  >
                    四半期の初めから今日まで
                  </SidebarButton>

                  <SidebarButton
                    active={activePreset === "yearToDate"}
                    onClick={() => applyPreset("yearToDate")}
                  >
                    年の初めから今日まで
                  </SidebarButton>
                </div>
              )}
            </aside>

            <div className="min-w-0">
              <div className="border-b p-2.5">
                <div className="mx-auto max-w-[720px] space-y-2">
                  <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                    <Input
                      value={formatDate(selectedDate?.from)}
                      readOnly
                      placeholder="開始日"
                      className="h-10"
                    />

                    <div className="text-muted-foreground">→</div>

                    <Input
                      value={formatDate(selectedDate?.to)}
                      readOnly
                      placeholder="終了日"
                      className="h-10"
                    />

                    <Button
                      type="button"
                      variant={showTime ? "default" : "outline"}
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => setShowTime((prev) => !prev)}
                    >
                      <Clock3 className="h-4 w-4" />
                    </Button>
                  </div>

                  {showTime && (
                    <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                      <Input
                        type="time"
                        value={fromTime}
                        onChange={(e) => setFromTime(e.target.value)}
                        className="h-10"
                      />

                      <div className="text-muted-foreground">→</div>

                      <Input
                        type="time"
                        value={toTime}
                        onChange={(e) => setToTime(e.target.value)}
                        className="h-10"
                      />

                      <div className="w-10" />
                    </div>
                  )}

                  {error && (
                    <div className="px-1 text-sm text-destructive">{error}</div>
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
                      onMonthChange={handleFromMonthChange}
                      numberOfMonths={1}
                      captionLayout="dropdown"
                      startMonth={CALENDAR_START_MONTH}
                      endMonth={CALENDAR_END_MONTH}
                      showOutsideDays={false}
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
                      onMonthChange={handleToMonthChange}
                      numberOfMonths={1}
                      captionLayout="dropdown"
                      startMonth={CALENDAR_START_MONTH}
                      endMonth={CALENDAR_END_MONTH}
                      showOutsideDays={false}
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
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    キャンセル
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleApply}
                    disabled={!!error || !!calendarOrderError}
                  >
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
