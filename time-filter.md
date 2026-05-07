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
