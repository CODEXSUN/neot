"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function WorkspaceSection({
  action,
  children,
  className,
  description,
  title
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  title?: string;
}) {
  return (
    <div className={cn("space-y-5", className)}>
      {title || description ? (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title ? <h3 className="text-base font-semibold text-foreground">{title}</h3> : null}
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
