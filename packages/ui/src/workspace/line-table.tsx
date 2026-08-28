"use client";

import type { ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../components/button";
import { cn } from "../lib/utils";

export function WorkspaceLineTableHeader({
  children,
  className,
  label
}: {
  children?: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-4", className)}>
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
      {children}
    </div>
  );
}

export function WorkspaceLineTable<T>({
  className,
  columns,
  data,
  emptyLabel = "No items added.",
  minWidth = "600px",
  onAdd,
  onDelete,
  onEdit,
  rowKey
}: {
  className?: string;
  columns: Array<{
    header: string;
    width?: string;
    render(row: T, index: number): ReactNode;
  }>;
  data: T[];
  emptyLabel?: string;
  minWidth?: string;
  onAdd?: () => void;
  onDelete?: (row: T, index: number) => void;
  onEdit?: (row: T, index: number) => void;
  rowKey: (row: T, index: number) => string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-border/70", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" style={{ minWidth }}>
          <thead className="bg-muted/45 text-muted-foreground">
            <tr>
              <th className="w-8 border-b border-border/70 px-2 py-2 text-center text-xs font-semibold uppercase">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.header}
                  className="border-b border-border/70 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
              <th className="w-16 border-b border-border/70 px-2 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={rowKey(row, index)} className="border-b border-border/60 last:border-b-0">
                <td className="border-r border-border/70 px-2 py-1.5 text-center text-muted-foreground">
                  {index + 1}
                </td>
                {columns.map((col) => (
                  <td key={col.header} className="px-3 py-1.5">
                    {col.render(row, index)}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    {onEdit ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 rounded-md"
                        onClick={() => onEdit(row, index)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    ) : null}
                    {onDelete ? (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 rounded-md text-destructive hover:text-destructive"
                        onClick={() => onDelete(row, index)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</div>
      ) : null}
      {onAdd ? (
        <div className="border-t border-border/70 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 rounded-md text-xs"
            onClick={onAdd}
          >
            <Plus className="size-3.5" />
            Add row
          </Button>
        </div>
      ) : null}
    </div>
  );
}
