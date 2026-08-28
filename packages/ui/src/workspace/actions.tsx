"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function WorkspaceActionBar({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 flex-wrap items-center gap-2", className)}>{children}</div>
  );
}
