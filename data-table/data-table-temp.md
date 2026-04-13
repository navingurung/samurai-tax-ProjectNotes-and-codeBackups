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
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { z } from "zod";

import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input"; // Added: search input
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
} from "@tabler/icons-react";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";

import { schema } from "@/app/dashboard/page";

// Added: reusable header button for sortable columns
function SortableHeader({
  column,
  title,
}: {
  column: any;
  title: string;
}) {
  return (
    <Button
      variant="ghost"
      className="h-auto px-0 font-medium hover:bg-transparent"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <IconChevronDown className="ml-1 size-4" />
    </Button>
  );
}

// Added: custom search filter for multiple fields
const globalSearchFilter: FilterFn<z.infer<typeof schema>> = (
  row,
  _columnId,
  value,
) => {
  const keyword = String(value ?? "").toLowerCase().trim();
  if (!keyword) return true;

  const item = row.original;

  return [
    item.id,
    item.shopName,
    item.name,
    item.nation,
    item.status,
    item.birthDate,
  ]
    .map((v) => String(v ?? "").toLowerCase())
    .some((v) => v.includes(keyword));
};

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
    header: ({ column }) => <SortableHeader column={column} title="ID" />, // Added: sorting
    enableHiding: false,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <SortableHeader column={column} title="取引作成日" />
    ), // Added: sorting
    cell: ({ getValue }) => {
      const date = new Date(getValue() as string);
      const JST_date = new Date(date.getTime() + 9 * 60 * 60 * 1000);
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
    header: ({ column }) => <SortableHeader column={column} title="店舗名" />, // Added: sorting
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column} title="氏名" />, // Added: sorting
  },
  {
    accessorKey: "nation",
    header: ({ column }) => <SortableHeader column={column} title="国籍" />, // Added: sorting
  },
  {
    accessorKey: "birthDate",
    header: ({ column }) => (
      <SortableHeader column={column} title="生年月日" />
    ), // Added: sorting
    cell: ({ getValue }) => {
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
  {
    accessorKey: "totalAmount",
    header: ({ column }) => (
      <SortableHeader column={column} title="合計金額" />
    ), // Added: sorting
  },
  {
    accessorKey: "totalTax",
    header: ({ column }) => <SortableHeader column={column} title="合計税額" />, // Added: sorting
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <SortableHeader column={column} title="ステータス" />
    ), // Added: sorting
    // Added: exact match status filter
    filterFn: (row, columnId, filterValue) => {
      if (!filterValue || filterValue === "all") return true;
      return row.getValue(columnId) === filterValue;
    },
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
    enableSorting: false,
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

  // Added: global search state
  const [globalFilter, setGlobalFilter] = React.useState("");

  // -----Added: Export Loading State (Optional) -----
  const [loading, setLoading] = React.useState<"csv" | "xlsx" | null>(null);

  const sortableId = React.useId();
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data],
  );

  // Added: status dropdown options
  const statusOptions = React.useMemo(
    () => [
      { value: "all", label: "すべて" },
      ...Object.entries(STATUS).map(([key, config]) => ({
        value: key,
        label: config.label,
      })),
    ],
    [],
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
      globalFilter, // Added: global search state into table
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

  // Added: current selected status value
  const selectedStatus =
    (table.getColumn("status")?.getFilterValue() as string) ?? "all";

  return (
    <Tabs
      defaultValue="outline"
      className="w-full flex-col justify-start gap-6"
    >
      {/* Added: toolbar area updated */}
      <div className="flex flex-col gap-3 px-4 lg:px-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left side */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          {/* Added: search input */}
          <Input
            placeholder="検索（ID・店舗名・氏名・国籍・ステータス）"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full lg:w-[320px]"
          />

          {/* Added: status dropdown + conditional clear button */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedStatus}
              onValueChange={(value) => {
                table.getColumn("status")?.setFilterValue(value);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedStatus !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.getColumn("status")?.setFilterValue("all")}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Existing: column customize dropdown */}
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
                      {typeof column.columnDef.header === "string"
                        ? column.columnDef.header
                        : column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right side: export */}
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
