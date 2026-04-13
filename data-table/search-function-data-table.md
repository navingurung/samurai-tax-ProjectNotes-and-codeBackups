```javascript
"use client";

import * as React from "react";
import { exportToCSV, exportToXLSX } from "@/lib/export";
import { STATUS, type Status } from "@/lib/constants/status";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconLayoutColumns,
  IconLoader,
  IconX,
} from "@tabler/icons-react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type FilterFn,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { toLowerCase, z } from "zod";

import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  IconDownload,
  IconFileSpreadsheet,
  IconFileTypeCsv,
  IconSearch,
} from "@tabler/icons-react";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";

import { schema } from "@/app/dashboard/page";
// Create a separate component for the drag handle
// function DragHandle({ id }: { id: number }) {
//   const { attributes, listeners } = useSortable({
//     id,
//   });

//   return (
//     <Button
//       {...attributes}
//       {...listeners}
//       variant="ghost"
//       size="icon"
//       className="text-muted-foreground size-7 hover:bg-transparent"
//     >
//       <IconGripVertical className="text-muted-foreground size-3" />
//       <span className="sr-only">Drag to reorder</span>
//     </Button>
//   );
// }

const globalSearchFilter: FilterFn<z.infer<typeof schema>> = (
  row, _columnId, filterValue
) => {
  const keywords = String(filterValue ?? "")
  .toLowerCase()
  .trim()
  .split(/\s+/)
  .filter(Boolean);

  if (!keywords) return true; // 空のキーワードは全ての行を表示

  const item = row.original;
  
  const searchableValues =  [
    item.id,
    item.name,
    item.nation
  ]    .map((v) => String(v ?? "").toLowerCase())
    .some((v) => v.includes(keywords.join(" "))); // キーワードをスペースで結合して検索

  return searchableValues;
}

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  // ── 選択用チェックボックス列 ─────────────────────────
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: "ID",
    enableHiding: false,
  },
  {
    accessorKey: "createdAt",
    header: "取引作成日",
    cell: ({ getValue }) => {
      const date = new Date(getValue() as string);
      const JST_date = new Date(date.getTime() + 9 * 60 * 60 * 1000); // JSTはUTC+9時間
      return (
        <span>
          {JST_date.getFullYear()}/{JST_date.getMonth() + 1}/
          {JST_date.getDate()} {JST_date.getHours()}:
          {JST_date.getMinutes().toString().padStart(2, "0")}
        </span>
      );
    },
  },
  {
    accessorKey: "shopName",
    header: "店舗名",
  },
  {
    accessorKey: "name",
    header: "氏名",
  },
  {
    accessorKey: "nation",
    header: "国籍",
  },
  {
    accessorKey: "birthDate",
    header: "生年月日",
    cell: ({ getValue }) => {
      // YYYYMMDDをYYYY/MM/DDに変換して表示
      const value = getValue() as string;
      if (value.length === 8) {
        return (
          <span>
            {value.slice(0, 4)}/{value.slice(4, 6)}/{value.slice(6, 8)}
          </span>
        );
      }
      return <span>{value}</span>;
    },
  },
  // {
  //   accessorKey: "email",
  //   header: "メールアドレス",
  // },
  {
    accessorKey: "totalAmount",
    header: "合計金額",
  },
  {
    accessorKey: "totalTax",
    header: "合計税額",
  },

{
  accessorKey: "status",
  header: "ステータス",
  cell: ({ row }) => {
    const status = row.original.status as Status;
    const config = STATUS[status];

    return (
      <Badge variant={config?.variant} className="px-1.5">
        {config?.variant === "success" ? (
          <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
        ) : (
          <IconLoader className="animate-spin duration-700" />
        )}
        {config?.label ?? status}
      </Badge>
    );
  },
},
  {
    id: "actions",
    cell: ({ row }) => (
      <Link href={`dashboard/refund/${row.original.id}`}>
        <Button variant="link" size="sm" className="px-2">
          <IconChevronRight />
        </Button>
      </Link>
    ),
  },
];

function DraggableRow({ row }: { row: Row<z.infer<typeof schema>> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  });

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

export function DataTable({
  data: initialData,
}: {
  data: z.infer<typeof schema>[];
}) {
  const [data, setData] = React.useState(() => initialData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [globalFilter, setGlobalFilter] = React.useState("");

  // -----Added: Export Loading State (Optional) -----  
  const [loading, setLoading] = React.useState<"csv" | "xlsx" | null>(null);

  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  // Update internal data when props change
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      globalFilter, // Added: search state
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter, // Added: search state updater
    globalFilterFn: globalSearchFilter, // Added: custom search logic
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);
        return arrayMove(data, oldIndex, newIndex);
      });
    }
  }

  // ── フィルタリング状態の判定 ────────────────────────────── 
  const hasFilters = globalFilter !== "";

  // ── フィルタリングのリセット ──────────────────────────────
  const resetFilters = () => {
    setGlobalFilter("");
  };

  // ── エクスポートデータ取得 ──────────────────────────────
  const getExportData = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const rowsToExport =
      selectedRows.length > 0
        ? selectedRows
        : table.getFilteredRowModel().rows;
    return rowsToExport.map((row) => ({
      ID: row.original.id,
      取引作成日: row.original.createdAt,
      店舗名: row.original.shopName,
      氏名: row.original.name,
      国籍: row.original.nation,
      生年月日:
        row.original.birthDate?.length === 8
          ? `${row.original.birthDate.slice(0, 4)}/${row.original.birthDate.slice(4, 6)}/${row.original.birthDate.slice(6, 8)}`
          : row.original.birthDate,
      合計金額: row.original.totalAmount,
      合計税額: row.original.totalTax,
      ステータス: row.original.status,
    }));
  };

  // ── Export Handler ──────────────────────────────────
  const handleExport = async (
    type: "csv" | "xlsx",
    action: () => void | Promise<void>,
  ) => {
    try {
      setLoading(type);
      await action();
    } finally {
      setLoading(null);
    }
  };

  return (
    <Tabs
      defaultValue="outline"
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between px-4 lg:px-6">

        {/* ── Left Side: 列をカスタマイズ  ──────────────────────────── */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">列をカスタマイズ</span>
                <span className="lg:hidden">列</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide(),
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {/* カラム名を入れる */}
                      {column.columnDef.header as string}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative max-w-xs w-full">
          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input 
              placeholder="検索: ID, 氏名, 国籍…………"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full lg:w-[220px] pl-8 h-8"
          />
          </div>

        {/* Clear filters */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-9 gap-1 text-muted-foreground"
          >
            <IconX className="h-3.5 w-3.5" />
          </Button>
        )}
        </div>

        {/* ── Right Side: CSV/Excel 出力 ──────────────────────────── */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {loading ? (
                  <IconLoader className="size-4 animate-spin" />
                ) : (
                  <IconDownload className="size-4" />
                )}
                <span>エクスポート</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                disabled={!!loading}
                onClick={() =>
                  handleExport("csv", () =>
                    exportToCSV(getExportData(), "refund-data"),
                  )
                }
                className="gap-2 cursor-pointer"
              >
                <IconFileTypeCsv className="size-4" />
                CSV
              </DropdownMenuItem>

              <DropdownMenuItem
                disabled={!!loading}
                onClick={() =>
                  handleExport("xlsx", () =>
                    exportToXLSX(getExportData(), "refund-data"),
                  )
                }
                className="gap-2 cursor-pointer"
              >
                <IconFileSpreadsheet className="size-4" />
                Excel (.xlsx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {/* {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected. */}
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                ページあたりの行数
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  const isMobile = useIsMobile();

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Link href={`dashboard/refund/${item.id}`}>
          <Button variant="link" className="px-0">
            {item.id}
          </Button>
        </Link>
      </DrawerTrigger>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Refund Detail</DrawerTitle>
          <DrawerDescription>
            {item.name} / {item.passportNo}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 space-y-3 text-sm">
          <div>Nation: {item.nation}</div>
          <div>Email: {item.email}</div>
          <div>Total Tax: {item.totalTax}</div>
          <div>Status: {item.status}</div>
          <div>Created At: {item.createdAt}</div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
```
