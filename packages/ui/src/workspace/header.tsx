"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function WorkspaceHeader({
  actions,
  backButton,
  className,
  statusBadge,
  subtitle,
  title
}: {
  actions?: ReactNode;
  backButton?: ReactNode;
  className?: string;
  statusBadge?: ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {backButton ? <div className="shrink-0">{backButton}</div> : null}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-normal text-foreground/80">
              {title}
            </h1>
            {statusBadge ? <div className="shrink-0">{statusBadge}</div> : null}
          </div>
          {subtitle ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground/70">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
