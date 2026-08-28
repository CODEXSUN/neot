"use client";

import { Check, Columns3, Filter, Search } from "lucide-react";
import type { ChangeEvent, ReactNode } from "react";
import { Button } from "../components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../components/dropdown-menu";
import { Input } from "../components/input";
import { cn } from "../lib/utils";
import type { WorkspaceColumnOption, WorkspaceFilterOption } from "./types";

export function WorkspaceFilters({
  className,
  columnOptions,
  filterOptions,
  filterValue,
  onColumnToggle: _onColumnToggle,
  onFilterValueChange,
  onSearchValueChange,
  onShowAllColumns,
  searchPlaceholder,
  searchValue,
  toolbarAction
}: {
  className?: string;
  columnOptions?: WorkspaceColumnOption[];
  filterOptions?: WorkspaceFilterOption[];
  filterValue?: string;
  onColumnToggle?: (id: string, checked: boolean) => void;
  onFilterValueChange?: (value: string) => void;
  onSearchValueChange: (value: string) => void;
  onShowAllColumns?: () => void;
  searchPlaceholder?: string;
  searchValue: string;
  toolbarAction?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border/70 bg-card/95 p-2 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-3",
        className
      )}
    >
      <div className="relative max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8 rounded-md border-border/80 bg-white pl-9 text-sm shadow-none"
          {...(searchPlaceholder ? { placeholder: searchPlaceholder } : {})}
          value={searchValue}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onSearchValueChange(event.target.value)
          }
        />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2.5 self-end sm:self-auto">
        {toolbarAction}
        {filterOptions && filterOptions.length > 0 && filterValue && onFilterValueChange ? (
          <FilterMenu
            filterOptions={filterOptions}
            filterValue={filterValue}
            onFilterValueChange={onFilterValueChange}
          />
        ) : null}
        {columnOptions && columnOptions.length > 0 ? (
          <ColumnMenu
            columnOptions={columnOptions}
            {...(onShowAllColumns ? { onShowAllColumns } : {})}
          />
        ) : null}
      </div>
    </div>
  );
}

function FilterMenu({
  filterOptions,
  filterValue,
  onFilterValueChange
}: {
  filterOptions: WorkspaceFilterOption[];
  filterValue: string;
  onFilterValueChange: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-8 rounded-md border-border/80 bg-white px-3 text-sm shadow-none"
          type="button"
          variant="outline"
        >
          <Filter className="size-4" />
          Filters
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-md p-0 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 text-sm font-medium">Filter options</DropdownMenuLabel>
          <button
            className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => onFilterValueChange(filterOptions[0]?.id ?? filterValue)}
            type="button"
          >
            Clear
          </button>
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          {filterOptions.map((option) => {
            const selected = filterValue === option.id;
            return (
              <DropdownMenuItem
                key={option.id}
                className="gap-3 rounded-md px-3 py-2.5"
                onSelect={() => onFilterValueChange(option.id)}
              >
                <span className="flex size-4 items-center justify-center">
                  {selected ? <Check className="size-4" /> : null}
                </span>
                <span>{option.label}</span>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ColumnMenu({
  columnOptions,
  onShowAllColumns
}: {
  columnOptions: WorkspaceColumnOption[];
  onShowAllColumns?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-8 rounded-md border-border/80 bg-white px-3 text-sm shadow-none"
          type="button"
          variant="outline"
        >
          <Columns3 className="size-4" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-md p-0 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <DropdownMenuLabel className="p-0 text-sm font-medium">Visible columns</DropdownMenuLabel>
          {onShowAllColumns ? (
            <button
              className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={onShowAllColumns}
              type="button"
            >
              Show all
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        <div className="p-2">
          {columnOptions.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.checked}
              className="rounded-md py-2.5 pl-9 pr-3"
              {...(column.disabled !== undefined ? { disabled: column.disabled } : {})}
              onCheckedChange={(checked) => column.onCheckedChange(Boolean(checked))}
            >
              {column.label}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
