```tsx
// lib/continental.ts
import { continent } from "@brixtol/country-continent";

// Map for Japanese continent names
export const CONTINENT_JA: Record<string, string> = {
  "Europe": "ヨーロッパ",
  "Asia": "アジア",
  "Africa": "アフリカ",
  "Oceania": "オセアニア",
  "North America": "北アメリカ",
  "South America": "南アメリカ",
  "Antarctica": "南極大陸",
  "Unknown": "未知",
  "Other": "その他"
};

// Result type for both languages
export type ContinentLabels = {
  en: string;
  ja: string;
};

/**
 * Returns the continent label in English/Japanese for any input (country code/name).
 * @param input - Country code (e.g. "JP", "CAN") or English country name (e.g. "Japan", "Nepal")
 */
export function getContinentLabels(input: string): ContinentLabels {
  const en = continent(input) || "Other";
  const ja = CONTINENT_JA[en] || "その他";
  return { en, ja };
}
```
