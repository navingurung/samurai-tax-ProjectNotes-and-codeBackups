### Dashboard/page.tsx  for Time Filter of Data correction after copilot comments
```tsx
  const timeFilteredData = useMemo(() => {
    if (!dateFilter?.useTime || !dateFilter.date?.from) return filteredData;

    const [fh, fm] = dateFilter.fromTime.split(":").map(Number);
    const [th, tm] = dateFilter.toTime.split(":").map(Number);
    // 開始時間と終了時間を分単位に変換
    const startMinutes = fh * 60 + fm;
    const endMinutes = th * 60 + tm;

    return filteredData.filter((item) => {
    const jst = new Date(new Date(item.createdAt).getTime() + 9 * 60 * 60 * 1000);
    const itemMinutes = jst.getHours() * 60 + jst.getMinutes();

    if( endMinutes >= startMinutes ) {
      // 例）10:00〜18:00 の場合
      return itemMinutes >= startMinutes && itemMinutes <= endMinutes;
    }
    else {
      // 日付またぎ：例）23:00〜02:00 の場合
      return itemMinutes >= startMinutes || itemMinutes <= endMinutes;
    }
  });
```
