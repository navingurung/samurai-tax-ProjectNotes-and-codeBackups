```javascript
import {
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
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
import { type DateRange } from "react-day-picker";

export type PresetType =
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

export type MenuType = "root" | "past" | "current";

export function getMenuFromPreset(preset: PresetType): MenuType {
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

export function getPresetRange(preset: PresetType): DateRange | undefined {
  const today = new Date();

  switch (preset) {
    case "today": {
      const from = startOfToday();
      const to = endOfDay(today);
      return { from, to };
    }

    case "yesterday": {
      const yesterday = subDays(today, 1);
      const from = startOfDay(yesterday);
      const to = endOfDay(yesterday);
      return { from, to };
    }

    case "last7Days": {
      const from = subDays(startOfToday(), 6);
      const to = endOfDay(today);
      return { from, to };
    }

    case "last30Days": {
      const from = subDays(startOfToday(), 29);
      const to = endOfDay(today);
      return { from, to };
    }

    case "last90Days": {
      const from = subDays(startOfToday(), 89);
      const to = endOfDay(today);
      return { from, to };
    }

    case "last365Days": {
      const from = subDays(startOfToday(), 364);
      const to = endOfDay(today);
      return { from, to };
    }

    case "lastWeek": {
      const previousWeek = subWeeks(today, 1);
      const from = startOfWeek(previousWeek, { locale: ja });
      const to = endOfWeek(previousWeek, { locale: ja });
      return { from, to };
    }

    case "lastMonth": {
      const previousMonth = subMonths(today, 1);
      const from = startOfMonth(previousMonth);
      const to = endOfMonth(previousMonth);
      return { from, to };
    }

    case "previousQuarter": {
      const previousQuarter = subQuarters(today, 1);
      const from = startOfQuarter(previousQuarter);
      const to = endOfQuarter(previousQuarter);
      return { from, to };
    }

    case "last12Months": {
      const from = startOfDay(subMonths(today, 12));
      const to = endOfDay(today);
      return { from, to };
    }

    case "lastYear": {
      const previousYear = subYears(today, 1);
      const from = startOfYear(previousYear);
      const to = endOfYear(previousYear);
      return { from, to };
    }

    case "weekToDate": {
      const from = startOfWeek(today, { locale: ja });
      const to = endOfDay(today);
      return { from, to };
    }

    case "monthToDate": {
      const from = startOfMonth(today);
      const to = endOfDay(today);
      return { from, to };
    }

    case "quarterToDate": {
      const from = startOfQuarter(today);
      const to = endOfDay(today);
      return { from, to };
    }

    case "yearToDate": {
      const from = startOfYear(today);
      const to = endOfDay(today);
      return { from, to };
    }

    case "last30Minutes":
    case "last12Hours":
    case "custom":
      return undefined;
  }
}

export function getPresetTimes(preset: PresetType) {
  const now = new Date();

  switch (preset) {
    case "last30Minutes": {
      const to = now;
      const from = new Date(now.getTime() - 30 * 60 * 1000);
      return {
        range: { from, to },
        useTime: true,
        fromTime: format(from, "HH:mm"),
        toTime: format(to, "HH:mm"),
      };
    }

    case "last12Hours": {
      const to = now;
      const from = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      return {
        range: { from, to },
        useTime: true,
        fromTime: format(from, "HH:mm"),
        toTime: format(to, "HH:mm"),
      };
    }

    default: {
      return {
        range: getPresetRange(preset),
        useTime: false,
        fromTime: "00:00",
        toTime: "23:59",
      };
    }
  }
}
```
