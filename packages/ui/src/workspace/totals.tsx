"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function WorkspaceTotalsPanel({
  className,
  rows
}: {
  className?: string;
  rows: Array<{ label: string; value: ReactNode; highlight?: boolean }>;
}) {
  return (
    <div
      className={cn(
        "flex justify-end border-t border-border/70 bg-muted/20 px-4 py-2 text-sm",
        className
      )}
    >
      <div className="grid min-w-48 grid-cols-[1fr_auto] gap-x-6 gap-y-1">
        {rows.map((row) => (
          <>
            <span
              key={`label-${row.label}`}
              className={cn("text-muted-foreground", row.highlight && "font-medium")}
            >
              {row.label}
            </span>
            <span
              key={`value-${row.label}`}
              className={cn(
                "text-right",
                row.highlight ? "font-semibold text-foreground" : "text-foreground"
              )}
            >
              {row.value}
            </span>
          </>
        ))}
      </div>
    </div>
  );
}
