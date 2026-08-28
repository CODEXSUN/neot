"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function WorkspacePanel({
  action,
  children,
  className,
  compact,
  description,
  title
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  description?: string;
  title?: string;
}) {
  return (
    <div className={cn("rounded-md border border-border/70 bg-card/95 shadow-sm", className)}>
      {title || description ? (
        <div className={cn("border-b border-border/70", compact ? "px-4 py-2.5" : "px-5 py-4")}>
          <div className="flex items-center justify-between">
            <div>
              {title ? (
                <h2
                  className={cn("font-medium text-foreground", compact ? "text-sm" : "text-base")}
                >
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p
                  className={cn(
                    "text-muted-foreground",
                    title && "mt-0.5",
                    compact ? "text-xs" : "text-sm"
                  )}
                >
                  {description}
                </p>
              ) : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        </div>
      ) : null}
      <div className={cn(compact ? "p-3" : "p-5")}>{children}</div>
    </div>
  );
}
