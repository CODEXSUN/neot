"use client";

import type { ReactNode } from "react";
import { CheckCircle2, Minus, XCircle } from "lucide-react";
import { Label } from "../components/label";
import { Switch } from "../components/switch";
import { cn } from "../lib/utils";
import type { WorkspaceStatusTone } from "./types";

const toneStyles: Record<WorkspaceStatusTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700"
};

const toneIcons: Record<WorkspaceStatusTone, ReactNode> = {
  neutral: <Minus className="size-3" />,
  success: <CheckCircle2 className="size-3" />,
  warning: <CheckCircle2 className="size-3" />,
  danger: <XCircle className="size-3" />,
  info: <CheckCircle2 className="size-3" />
};

export function WorkspaceStatusBadge({
  className,
  label,
  showIcon = true,
  status,
  tone = "neutral"
}: {
  className?: string;
  label?: string;
  showIcon?: boolean;
  status?: string;
  tone?: WorkspaceStatusTone;
}) {
  const resolvedTone = status
    ? status === "posted" || status === "confirmed"
      ? "success"
      : status === "cancelled"
        ? "danger"
        : "warning"
    : tone;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] font-medium",
        toneStyles[resolvedTone],
        className
      )}
    >
      {showIcon ? toneIcons[resolvedTone] : null}
      {label ?? status ?? "Unknown"}
    </span>
  );
}

export function WorkspaceStatusToggle({
  active,
  activeLabel = "Active",
  className,
  inactiveLabel = "Inactive",
  onClick
}: {
  active: boolean;
  activeLabel?: string;
  className?: string;
  inactiveLabel?: string;
  onClick?: () => void;
}) {
  const tone: WorkspaceStatusTone = active ? "success" : "warning";
  return (
    <button
      className={cn(
        "inline-flex h-6 cursor-pointer items-center gap-1 rounded-md border px-2 text-[11px] font-medium shadow-none hover:opacity-80",
        toneStyles[tone],
        className
      )}
      onClick={onClick}
      type="button"
    >
      {active ? <CheckCircle2 className="size-3" /> : <Minus className="size-3" />}
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}

export function WorkspaceSwitchCard({
  activeLabel = "Active",
  ariaLabel,
  checked,
  className,
  description,
  disabled,
  fieldLabel,
  inactiveLabel = "Inactive",
  label,
  onCheckedChange
}: {
  activeLabel?: ReactNode;
  ariaLabel?: string;
  checked: boolean;
  className?: string;
  description?: ReactNode;
  disabled?: boolean;
  fieldLabel?: ReactNode;
  inactiveLabel?: ReactNode;
  label?: ReactNode;
  onCheckedChange: (checked: boolean) => void;
}) {
  const card = (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors",
        checked
          ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30"
          : "border-border bg-muted/30",
        disabled && "opacity-60",
        className
      )}
      data-state={checked ? "checked" : "unchecked"}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {label ?? (checked ? activeLabel : inactiveLabel)}
        </p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Switch
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );

  return fieldLabel ? (
    <div className="grid gap-2">
      <Label className="text-sm font-medium text-muted-foreground">{fieldLabel}</Label>
      {card}
    </div>
  ) : (
    card
  );
}
