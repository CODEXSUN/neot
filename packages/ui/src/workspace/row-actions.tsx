"use client";

import { cn } from "../lib/utils";
import { Eye, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "../components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../components/dropdown-menu";
import type { ReactNode } from "react";

export interface WorkspaceRowAction {
  id: string;
  icon?: ReactNode;
  label: string;
  tone?: "default" | "destructive";
  onSelect(): void;
}

export function WorkspaceRowActions({
  actions,
  deleteLabel = "Suspend",
  isSuspended = false,
  onDelete,
  onEdit,
  onRestore,
  onView,
  restoreLabel = "Restore",
  title
}: {
  actions?: WorkspaceRowAction[];
  deleteLabel?: string;
  isSuspended?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onRestore?: () => void;
  onView?: () => void;
  restoreLabel?: string;
  title: string;
}) {
  const hasMainActions = onView || onEdit || onDelete || onRestore;
  const hasCustomActions = actions && actions.length > 0;

  if (!hasMainActions && !hasCustomActions) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`${title} actions`}
          size="icon"
          type="button"
          variant="ghost"
          className="size-8 cursor-pointer rounded-md border border-border/70 bg-background/80 text-muted-foreground shadow-none transition-colors hover:bg-muted/70 hover:text-foreground"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 rounded-md border-border/80 bg-popover p-1.5 text-popover-foreground shadow-lg"
      >
        {onView ? (
          <DropdownMenuItem className="cursor-pointer gap-2 rounded-sm px-3 py-2" onSelect={onView}>
            <Eye className="size-4" />
            View
          </DropdownMenuItem>
        ) : null}
        {onEdit ? (
          <>
            {onView ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              className="cursor-pointer gap-2 rounded-sm px-3 py-2"
              onSelect={onEdit}
            >
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
          </>
        ) : null}
        {onDelete || onRestore ? (
          <>
            {onView || onEdit ? <DropdownMenuSeparator /> : null}
            {isSuspended && onRestore ? (
              <DropdownMenuItem
                className="cursor-pointer gap-2 rounded-sm px-3 py-2"
                onSelect={onRestore}
              >
                <RotateCcw className="size-4" />
                {restoreLabel}
              </DropdownMenuItem>
            ) : onDelete ? (
              <DropdownMenuItem
                className="cursor-pointer gap-2 rounded-sm px-3 py-2 text-destructive focus:text-destructive"
                onSelect={onDelete}
              >
                <Trash2 className="size-4" />
                {deleteLabel}
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
        {actions && actions.length > 0 ? (
          <>
            {hasMainActions ? <DropdownMenuSeparator /> : null}
            {actions.map((action, index) => (
              <div key={action.id}>
                {index > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  className={cn(
                    "cursor-pointer gap-2 rounded-sm px-3 py-2",
                    action.tone === "destructive" && "text-destructive focus:text-destructive"
                  )}
                  onSelect={action.onSelect}
                >
                  {action.icon}
                  {action.label}
                </DropdownMenuItem>
              </div>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
