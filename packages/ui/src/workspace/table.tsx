"use client";

import {
  flexRender,
  type RowData,
  type SortingState
} from "@tanstack/react-table";
import {
  getCoreRowModel,
  getSortedRowModel,
  type LegacyColumnDef as ColumnDef,
  useLegacyTable
} from "@tanstack/react-table/legacy";
import { ArrowUpDown } from "lucide-react";
import { useRef, useState, type ReactNode, type ThHTMLAttributes } from "react";
import { cn } from "../lib/utils";
import { Spinner } from "../components/spinner";

export const workspaceTablePanelClass =
  "overflow-hidden rounded-md border border-border/70 bg-card/95 shadow-sm";

export const workspaceTableHeaderClass =
  "border-b border-border/70 bg-muted/50 px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export const workspaceTableRowClass =
  "border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/20";

export const workspaceTableCellClass = "px-4 py-2.5 text-foreground";

export function WorkspaceTable<T extends RowData>({
  columns,
  data,
  emptyState,
  isLoading,
  minWidth = "640px",
  onRowClick
}: {
  columns: ColumnDef<T>[];
  data: T[];
  emptyState?: ReactNode;
  isLoading?: boolean;
  minWidth?: string;
  onRowClick?: (row: T) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const settledData = useRef(data);

  if (!isLoading) settledData.current = data;
  const visibleData = isLoading && data.length === 0 ? settledData.current : data;

  const table = useLegacyTable({
    columns,
    data: visibleData,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting }
  });

  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <WorkspaceTableHeaderCell
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          "flex items-center gap-1",
                          header.column.getCanSort() && "cursor-pointer select-none"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() ? (
                          <ArrowUpDown className="size-3.5 text-muted-foreground/60" />
                        ) : null}
                      </div>
                    )}
                  </WorkspaceTableHeaderCell>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(workspaceTableRowClass, onRowClick && "cursor-pointer")}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={workspaceTableCellClass}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.getRowModel().rows.length === 0 ? (
        isLoading ? (
          <WorkspaceTableLoadingState />
        ) : (
          <WorkspaceTableEmptyState>{emptyState ?? "No records found."}</WorkspaceTableEmptyState>
        )
      ) : null}
    </WorkspaceTablePanel>
  );
}

export function WorkspaceTablePanel({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(workspaceTablePanelClass, className)}>{children}</div>;
}

export function WorkspaceTableHeaderCell({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn(workspaceTableHeaderClass, className)} {...props}>
      {children}
    </th>
  );
}

export function WorkspaceTableEmptyState({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 py-14 text-center text-sm text-muted-foreground", className)}>
      {children}
    </div>
  );
}

export function WorkspaceTableLoadingState() {
  return (
    <div
      aria-label="Loading records"
      aria-live="polite"
      className="flex min-h-32 items-center justify-center"
      role="status"
    >
      <Spinner aria-hidden="true" className="size-6 text-primary" />
    </div>
  );
}
