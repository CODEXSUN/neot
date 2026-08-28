"use client";

import type { ReactNode } from "react";
import { WorkspacePage } from "../page";
import { WorkspaceTablePanel } from "../table";
import { WorkspaceRowActions } from "../row-actions";
import { WorkspaceShowCard, WorkspaceDetailTable } from "../show";
import { WorkspaceUpsertPage, WorkspaceFormPanel } from "../upsert";

export const MasterList = WorkspacePage;
export const MasterTablePanel = WorkspaceTablePanel;
export const MasterShowCard = WorkspaceShowCard;
export const MasterDetailTable = WorkspaceDetailTable;
export const MasterUpsertCard = WorkspaceFormPanel;
export const MasterRowActions = WorkspaceRowActions;

export function MasterShowLayout({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">{children}</div>;
}

export function MasterUpsertLayout({ children }: { children: ReactNode }) {
  return <div className="grid gap-4">{children}</div>;
}

export function MasterUpsertPage({
  action,
  children,
  description,
  onBack,
  title
}: {
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  onBack?: () => void;
  title: string;
}) {
  return (
    <WorkspaceUpsertPage
      action={action}
      title={title}
      {...(description ? { description } : {})}
      {...(onBack ? { onBack } : {})}
    >
      {children}
    </WorkspaceUpsertPage>
  );
}

export function MasterFormPage({
  action,
  children,
  description,
  title
}: {
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="mx-auto w-[94%] space-y-4 py-4 sm:w-[92%] lg:w-[90%] lg:py-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-normal text-foreground/80">{title}</h1>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground/70">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
