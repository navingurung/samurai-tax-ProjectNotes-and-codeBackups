https://linear.app/tai-matsu/issue/SAM-113/性別表示の統一対応data-table免税申請詳細ページ


1. Create lib/constants/gender.ts
```typescript
export const GENDER_MAP: Record<string, string> = {
  M: "男性",
  Male: "男性",
  F: "女性",
  Female: "女性",
  null: "-",
  undefined: "-",
  "": "-",
};

export const getGenderLabel = (gender: string): string => {
  return GENDER_MAP[gender] ?? "その他";
};
```


2. on app/Dashboard/page.tsx

```tsx
import { getGenderLabel } from "@/lib/constants/gender";

// 404
<Info label="性別" value={getGenderLabel(refund.gender)} />
```


3. components/data-table/columns.tsx
```tsx
import { getGenderLabel } from "@/lib/constants/gender";

// on gender

    cell: ({ getValue }) => {
      const value = getValue() as string;
      return <span>{getGenderLabel(value)}</span>;
    },

```


4. components/data-table
```tsx
import { getGenderLabel } from "@/lib/constants/gender";

// lines: 242
性別: getGenderLabel(row.original.gender),
```
