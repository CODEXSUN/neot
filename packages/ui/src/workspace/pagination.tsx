"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../components/select";
import { cn } from "../lib/utils";
import { buildPaginationItems } from "./utils";

export function WorkspacePagination({
  className,
  onNextPage,
  onPageChange,
  onPreviousPage,
  onRowsPerPageChange,
  page,
  rowsPerPage,
  rowsPerPageOptions = [10, 20, 50, 100, 200, 500],
  showingLabel,
  singularLabel,
  totalCount,
  totalPages
}: {
  className?: string;
  onNextPage?: () => void;
  onPageChange?: (page: number) => void;
  onPreviousPage?: () => void;
  onRowsPerPageChange?: (value: number) => void;
  page: number;
  rowsPerPage: number;
  rowsPerPageOptions?: readonly number[];
  showingLabel: string;
  singularLabel: string;
  totalCount: number;
  totalPages: number;
}) {
  const pageItems = buildPaginationItems(page, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-md border border-border/70 bg-card/95 px-4 py-2 text-sm text-muted-foreground shadow-sm lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <span className="whitespace-nowrap">
          Total {singularLabel}: <span className="font-semibold text-foreground">{totalCount}</span>
        </span>
        <div className="flex min-w-max shrink-0 items-center gap-2 whitespace-nowrap">
          <span className="whitespace-nowrap">Rows per page</span>
          <Select
            value={String(rowsPerPage)}
            onValueChange={(nextValue) => onRowsPerPageChange?.(Number.parseInt(nextValue, 10))}
          >
            <SelectTrigger className="h-8 min-w-20 rounded-md border-border/80 bg-white text-sm shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start" className="min-w-20 rounded-md">
              {rowsPerPageOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-start gap-2.5 lg:justify-end">
        <span className="whitespace-nowrap">{showingLabel}</span>
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <Button
            className="h-8 rounded-md px-2 text-muted-foreground"
            disabled={page <= 1}
            onClick={onPreviousPage}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {pageItems.map((item, index) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="px-1.5 text-sm text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={item}
                  className={cn(
                    "h-8 min-w-8 rounded-md px-0",
                    item === page
                      ? "bg-primary text-primary-foreground hover:bg-primary/95"
                      : "text-muted-foreground"
                  )}
                  onClick={() => onPageChange?.(item)}
                  size="sm"
                  type="button"
                  variant={item === page ? "default" : "ghost"}
                >
                  {item}
                </Button>
              )
            )}
          </div>
          <Button
            className="h-8 rounded-md px-2 text-muted-foreground"
            disabled={page >= totalPages}
            onClick={onNextPage}
            size="sm"
            type="button"
            variant="ghost"
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
