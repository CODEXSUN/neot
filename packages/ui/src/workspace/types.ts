"use client";

import type { ReactNode } from "react";

export type WorkspaceStatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export type WorkspaceListViewState<T> =
  { mode: "list" } | { mode: "show"; record: T } | { mode: "upsert"; record: T | null };

export type WorkspaceListPreset = "common" | "master" | "entry";

export type WorkspaceUpsertSurface = "dialog" | "page";

export interface WorkspaceListColumn<T> {
  id: string;
  label: string;
  visible?: boolean;
  width?: string;
  sortable?: boolean;
  render(row: T): ReactNode;
}

export interface WorkspaceListAction<T> {
  id: string;
  label: string;
  icon?: ReactNode;
  tone?: "default" | "destructive";
  onSelect(row: T): void;
}

export interface WorkspaceFilterOption {
  id: string;
  label: string;
}

export interface WorkspaceColumnOption {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange(checked: boolean): void;
}
