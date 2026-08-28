"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function WorkspaceShowLayout({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]", className)}>{children}</div>
  );
}

export function WorkspaceShowCard({
  children,
  className,
  title
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div className={cn("rounded-md border border-border/70 bg-card/95 shadow-sm", className)}>
      {title ? (
        <div className="border-b border-border/70 px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
      ) : null}
      <div>{children}</div>
    </div>
  );
}

export function WorkspaceDetailTable({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="overflow-hidden rounded-b-md">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-border/60 last:border-b-0">
              <th className="w-40 border-r border-border/70 bg-muted/35 px-3 py-2.5 text-left align-top text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </th>
              <td className="px-3 py-2.5 align-top font-medium text-foreground">
                {value ?? <span className="text-muted-foreground">Not set</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
