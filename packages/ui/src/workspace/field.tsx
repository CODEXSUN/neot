"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { Label } from "../components/label";

export function WorkspaceField({
  children,
  className,
  error,
  helpText,
  label
}: {
  children: ReactNode;
  className?: string;
  error?: string;
  helpText?: string;
  label: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label
        className={cn("text-sm font-medium", error ? "text-destructive" : "text-muted-foreground")}
      >
        {label}
      </Label>
      {children}
      {helpText && !error ? <p className="text-xs text-muted-foreground">{helpText}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function WorkspaceFieldGroup({
  children,
  className,
  columns = 2
}: {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-6 gap-y-5",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 md:grid-cols-2",
        columns === 3 && "grid-cols-1 md:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}
