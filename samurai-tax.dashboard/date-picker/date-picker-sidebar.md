```javascript
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  type MenuType,
  type PresetType,
} from "./date-picker-presets";

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

interface DatePickerSidebarProps {
  activeMenu: MenuType;
  activePreset: PresetType;
  onPresetSelect: (preset: PresetType) => void;
  onMenuChange: (menu: MenuType) => void;
}

export function DatePickerSidebar({
  activeMenu,
  activePreset,
  onPresetSelect,
  onMenuChange,
}: DatePickerSidebarProps) {
  return (
    <aside className="border-r bg-muted/20 p-2.5">
      {activeMenu === "root" && (
        <div className="space-y-1">
          <SidebarButton
            active={activePreset === "today"}
            onClick={() => onPresetSelect("today")}
          >
            今日
          </SidebarButton>

          <SidebarButton
            active={activePreset === "yesterday"}
            onClick={() => onPresetSelect("yesterday")}
          >
            昨日
          </SidebarButton>

          <SidebarButton onClick={() => onMenuChange("past")} withArrow>
            過去
          </SidebarButton>

          <SidebarButton onClick={() => onMenuChange("current")} withArrow>
            現在までの期間
          </SidebarButton>

          <SidebarButton
            active={activePreset === "custom"}
            onClick={() => onPresetSelect("custom")}
          >
            カスタム期間
          </SidebarButton>
        </div>
      )}

      {activeMenu === "past" && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onMenuChange("root")}
            className="mb-2 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
            過去
          </button>

          <SidebarButton
            active={activePreset === "last30Minutes"}
            onClick={() => onPresetSelect("last30Minutes")}
          >
            過去30分間
          </SidebarButton>

          <SidebarButton
            active={activePreset === "last12Hours"}
            onClick={() => onPresetSelect("last12Hours")}
          >
            過去12時間
          </SidebarButton>

          <SidebarButton
            active={activePreset === "last7Days"}
            onClick={() => onPresetSelect("last7Days")}
          >
            過去7日間
          </SidebarButton>

          <SidebarButton
            active={activePreset === "last30Days"}
            onClick={() => onPresetSelect("last30Days")}
          >
            過去30日間
          </SidebarButton>

          <SidebarButton
            active={activePreset === "last90Days"}
            onClick={() => onPresetSelect("last90Days")}
          >
            過去90日間
          </SidebarButton>

          <SidebarButton
            active={activePreset === "last365Days"}
            onClick={() => onPresetSelect("last365Days")}
          >
            過去365日間
          </SidebarButton>

          <div className="my-2 border-t" />

          <SidebarButton
            active={activePreset === "lastWeek"}
            onClick={() => onPresetSelect("lastWeek")}
          >
            先週
          </SidebarButton>

          <SidebarButton
            active={activePreset === "lastMonth"}
            onClick={() => onPresetSelect("lastMonth")}
          >
            先月
          </SidebarButton>

          <SidebarButton
            active={activePreset === "previousQuarter"}
            onClick={() => onPresetSelect("previousQuarter")}
          >
            前四半期
          </SidebarButton>

          <SidebarButton
            active={activePreset === "last12Months"}
            onClick={() => onPresetSelect("last12Months")}
          >
            過去12か月
          </SidebarButton>

          <SidebarButton
            active={activePreset === "lastYear"}
            onClick={() => onPresetSelect("lastYear")}
          >
            昨年
          </SidebarButton>
        </div>
      )}

      {activeMenu === "current" && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onMenuChange("root")}
            className="mb-2 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
            現在までの期間
          </button>

          <SidebarButton
            active={activePreset === "weekToDate"}
            onClick={() => onPresetSelect("weekToDate")}
          >
            週の初めから今日まで
          </SidebarButton>

          <SidebarButton
            active={activePreset === "monthToDate"}
            onClick={() => onPresetSelect("monthToDate")}
          >
            月の初めから今日まで
          </SidebarButton>

          <SidebarButton
            active={activePreset === "quarterToDate"}
            onClick={() => onPresetSelect("quarterToDate")}
          >
            四半期の初めから今日まで
          </SidebarButton>

          <SidebarButton
            active={activePreset === "yearToDate"}
            onClick={() => onPresetSelect("yearToDate")}
          >
            年の初めから今日まで
          </SidebarButton>
        </div>
      )}
    </aside>
  );
}
```
