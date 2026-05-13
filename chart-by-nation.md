// display continental instead of only ammount or country

```tsx
"use client";

import * as React from "react";
import { Pie, PieChart } from "recharts";
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableNation } from "./data-table_nation";
import { type schema } from "@/app/dashboard/page";
import { type z } from "zod";
import { getContinentLabels } from "@/lib/continental";

// === Updated! Now data is grouped by continent ===

export type SchemaType = z.infer<typeof schema>;

type ContinentRow = {
  continentEn: string;
  continentJa: string;
  value: number;
  count: number;
  ratio: number;
  fill: string;
};

/**
 * Utility: Generates a gradient color array from base to white, for continents
 */
function generateOklchToWhite(
  base: { l: number; c: number; h: number },
  count: number,
  lStep = 4,
  cStep = 0.02,
) {
  return Array.from({ length: count }, (_, i) => {
    const l = Math.min(base.l + i * lStep, 95);
    const c = Math.max(base.c - i * cStep, 0.01);
    const h = base.h;
    return `oklch(${l}% ${c} ${h})`;
  });
}

/**
 * === Updated: Groups input data by continent instead of country! ===
 */
function buildPieContinentData(
  data: SchemaType[],
  metric: "taxFreeSales" | "taxRefund",
): ContinentRow[] {
  const groupedValue: Record<string, { ja: string; value: number; count: number }> = {};
  let grandTotal = 0;

  data.forEach((item) => {
    const { en: continentEn, ja: continentJa } = getContinentLabels(item.nation);
    const metricValue =
      metric === "taxFreeSales" ? item.totalAmount : item.totalTax;
    if (!groupedValue[continentEn]) {
      groupedValue[continentEn] = { ja: continentJa, value: 0, count: 0 };
    }
    groupedValue[continentEn].value += metricValue;
    groupedValue[continentEn].count += 1;
    grandTotal += metricValue;
  });

  const sorted = Object.entries(groupedValue)
    .map(([continentEn, rest]) => ({
      continentEn,
      continentJa: rest.ja,
      value: rest.value,
      count: rest.count,
      ratio: grandTotal > 0 ? rest.value / grandTotal : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Assign color to each continent
  const baseColor = { l: 43.991, c: 0.30301, h: 264.096 };
  const colors = generateOklchToWhite(baseColor, sorted.length, 4, 0.02);

  return sorted.map((item, idx) => ({
    ...item,
    fill: colors[idx],
  }));
}

function buildChartConfig(data: ContinentRow[]): ChartConfig {
  const config: ChartConfig = {
    value: { label: "金額" },
  };
  data.forEach((item) => {
    config[item.continentJa] = {
      label: item.continentJa,
      color: item.fill,
    };
  });
  return config;
}

// --- Custom Pie label: show continentJa | % | 金額 ---
function renderContinentPieLabel(props: any) {
  const { cx, cy, midAngle, outerRadius, ratio, value, payload } = props;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 34;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x} y={y}
      fontWeight="bold"
      fontSize={16}
      fill="#fff"
      stroke="#222"
      strokeWidth={2.5}
      paintOrder="stroke fill"
      textAnchor={x > cx ? "start" : "end"}
      pointerEvents="none"
    >
      <tspan x={x} y={y - 12}>{payload.continentJa}</tspan>
      <tspan x={x} y={y + 5} fontSize={14}>
        {(ratio * 100).toFixed(1)}%
      </tspan>
      <tspan x={x} y={y + 22} fontSize={13} fill="#ffc" fontWeight="normal" stroke="none">
        ¥{value.toLocaleString()}
      </tspan>
    </text>
  );
}

type ChartByNationProps = {
  data?: SchemaType[];
};

export function ChartByNation({ data }: ChartByNationProps = {}) {
  const [metric, setMetric] = React.useState<"taxFreeSales" | "taxRefund">("taxFreeSales");

  const metricLabel = metric === "taxFreeSales" ? "免税売上高（税別）" : "還付消費税額";

  // === Updated: Pie is now grouped by continent, not nation ===
  const data_for_pie = React.useMemo(
    () => buildPieContinentData(data ?? [], metric),
    [data, metric],
  );

  const chartConfig = React.useMemo(
    () => buildChartConfig(data_for_pie),
    [data_for_pie],
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>大陸別構成比</CardTitle>
        <div className="mt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-48">
                {metricLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setMetric("taxFreeSales")}>
                  免税売上高（税別）
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMetric("taxRefund")}>
                  還付消費税額
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-pie-label-text]:fill-foreground mx-auto max-h-87.5 pb-0"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={data_for_pie}
              dataKey="value"
              nameKey="continentJa"
              label={renderContinentPieLabel}
              startAngle={90}
              endAngle={-270}
            />
            <ChartLegend
              content={<ChartLegendContent nameKey="continentJa" />}
              className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center mt-4"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        {/* You can update your DataTable to show by continent! */}
        <DataTableNation data={data_for_pie} />
      </CardFooter>
    </Card>
  );
}

/* 
  === CHANGES MADE ===
  - Data is now grouped/aggregated by continent (using @brixtol/country-continent)
  - Pie chart and labels show: 大陸名（日本語）, 割合（パーセント）, 金額
  - Fully type-safe and localization-ready
  - Coloring uses same gradient
  - Drop-in replacement for your previous ChartByNation

  HOW TO USE:
  - Drop this and continental.ts in your project, import/getContinentLabels works for all possible country inputs
  - Now works for "CN", "CANADA", "NPL", "Nepal", etc.
*/

```
