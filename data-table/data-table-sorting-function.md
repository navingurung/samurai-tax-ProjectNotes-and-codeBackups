```javascript

import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconLayoutColumns,
  IconLoader,
  IconDownload,
  IconFileSpreadsheet,
  IconFileTypeCsv,
  IconArrowsUpDown,
  IconSortAscending,
  IconSortDescending,
  IconRotate,
} from "@tabler/icons-react";


function SortableHeader({
  column,
  title,
}: {
  column: any;
  title: string;
}) {
  const sortState = column.getIsSorted(); // false | "asc" | "desc"

  const currentIcon =
    sortState === "asc" ? (
      <IconSortAscending className="ml-1 h-3.5 w-3.5 text-muted-foreground/70" />
    ) : sortState === "desc" ? (
      <IconSortDescending className="ml-1 h-3.5 w-3.5 text-muted-foreground/70" />
    ) : (
      <IconArrowsUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/70" />
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="-ml-2 h-8 cursor-pointer">
          {title}
          {currentIcon}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-36">
        <DropdownMenuItem
          onClick={() => column.clearSorting()}
          className="gap-2 cursor-pointer"
        >
          <IconRotate className="h-4 w-4" />
          Default
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => column.toggleSorting(false)}
          className="gap-2 cursor-pointer"
        >
          <IconSortAscending className="h-4 w-4" />
          昇順
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => column.toggleSorting(true)}
          className="gap-2 cursor-pointer"
        >
          <IconSortDescending className="h-4 w-4" />
          降順
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

```

<img width="1605" height="335" alt="Screenshot 2026-04-08 at 21 29 53" src="https://github.com/user-attachments/assets/0eaaecd1-3b30-4606-b627-0b226f70e6e8" />

<img width="1598" height="201" alt="Screenshot 2026-04-08 at 21 30 09" src="https://github.com/user-attachments/assets/fc916652-cf80-4b53-aae2-f35e3b68c002" />



