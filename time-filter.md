## Date Filter → DataTable Integration

### `filter.tsx`
- Changed `onDateChange` → `onFilterChange` (accepts `DateTimeRangeFilter`)
- Pass `onFilterChange` to `DatePickerWithRange`

### `dashboard/page.tsx`
- Added `dateFilter` state (`DateTimeRangeFilter | undefined`)
- `onFilterChange` → sets both `dateFilter` (for DataTable) and `date` (for API call)
- Pass `dateFilter` to `<DataTable />`

### `data-table.tsx`
- Added `dateFilter` prop
- Added `timeFilteredData` useMemo — filters rows by `fromTime`~`toTime` (JST) when time is enabled
- `data` state and `useEffect` now use `timeFilteredData` instead of `initialData`


filter.tsx
----------
feat: replace onDateChange with onFilterChange to support DateTimeRangeFilter

page.tsx
--------
feat: add timeFilteredData useMemo and apply time filter to all dashboard components

data-table.tsx
--------------
feat: add dateFilter prop and client-side time filtering to DataTable


filter.tsx
----------
feat: DateTimeRangeFilter に対応するため onDateChange を onFilterChange に変更

page.tsx
--------
feat: timeFilteredData useMemo を追加し、全ダッシュボードコンポーネントに時間フィルターを適用

data-table.tsx
--------------
feat: dateFilter プロップと クライアントサイドの時間フィルタリングを DataTable に追加
