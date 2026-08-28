"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function WorkspacePage({
  action,
  actions,
  children,
  className,
  description,
  onBack,
  technicalName,
  title
}: {
  action?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  onBack?: () => void;
  technicalName?: string;
  title: string;
}) {
  return (
    <section
      data-technical-name={technicalName}
      className={cn(
        "mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-4 py-4 lg:w-[calc(100%-3rem)] lg:py-5",
        className
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {title ? (
            <h1 className="text-2xl font-semibold tracking-normal text-foreground/80">{title}</h1>
          ) : null}
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground/70">{description}</p>
          ) : null}
        </div>
        {actions || action || onBack ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {onBack ? (
              <button
                className="rounded-md border px-3 py-2 text-sm"
                onClick={onBack}
                type="button"
              >
                Back
              </button>
            ) : null}
            {actions ?? action}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}
