| Change | Detail |
|---|---|
| Removed slice labels | No more amounts cluttering the pie slices |
| Custom tooltip | Shows flag + country + % badge + 金額 + 件数 in a styled card |
| Hover focus effect | Active slice expands outward using `activeShape` + `Sector` |
| Country flag in tooltip | Uses existing `CountryFlag` component |
| "その他" badge fix | Adaptive text color so % remains visible on light muted backgrounds |


```tsx

import { Pie, PieChart, Sector, type SectorProps } from "recharts";

import { CountryFlag } from "./country-flag/country-flag";


<ChartTooltip content={<ChartTooltipContent />} />

 <PieChart>
        <ChartTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as NationRow;
            return (
              <div className="bg-background border border-border rounded-xl shadow-lg p-4 min-w-48 space-y-3">
                <div className="flex items-center gap-2">
                  <CountryFlag code={d.country} className="h-5 w-7 rounded-sm shadow-sm" />
                  <span className="font-semibold text-sm text-foreground">{d.country}</span>
                  <span
                    className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: d.fill,
                      color: d.country === "その他" ? "var(--foreground)" : "white",
                      borderColor: d.country === "その他" ? "var(--border)" : "transparent",
                    }}
                  >
                    {(d.ratio * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-4">
                    <span>金額</span>
                    <span className="font-medium text-foreground">¥{d.value.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>件数</span>
                    <span className="font-medium text-foreground">{d.count.toLocaleString()}件</span>
                  </div>
                </div>
              </div>
            );
          }}
        />
        <Pie
          data={data_for_pie}
          dataKey="value"
          nameKey="country"
          startAngle={90}
          endAngle={-270}
          activeShape={(props: SectorProps) => (
            <Sector
              {...props}
              outerRadius={(props.outerRadius ?? 0) + 10}
              stroke="var(--background)"
              strokeWidth={2}
            />
          )}
        />
        <ChartLegend
          content={<ChartLegendContent nameKey="country" />}
          className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center mt-4"
        />
      </PieChart>



     activeShape={(props: SectorProps) => (
        <Sector
          {...props}
          outerRadius={(props.outerRadius ?? 0) + 10}
          stroke="var(--background)"
          strokeWidth={2}
        />
      )}
```
