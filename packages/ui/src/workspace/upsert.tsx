"use client";

import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, ArrowLeft, Info } from "lucide-react";
import { Button } from "../components/button";
import { Label } from "../components/label";
import { cn } from "../lib/utils";

export function WorkspaceUpsertPage({
  action,
  backLabel = "Back",
  children,
  className,
  description,
  onBack,
  title
}: {
  action?: ReactNode;
  backLabel?: string;
  children: ReactNode;
  className?: string;
  description?: string;
  onBack?: () => void;
  title: string;
}) {
  return (
    <section
      className={cn(
        "mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-4 py-4 lg:w-[calc(100%-3rem)] lg:py-5",
        className
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-normal text-foreground/80">{title}</h1>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground/70">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onBack ? (
            <Button type="button" variant="outline" onClick={onBack} className="h-9 rounded-md">
              <ArrowLeft className="size-4" />
              {backLabel}
            </Button>
          ) : null}
          {action}
        </div>
      </div>
      {children}
    </section>
  );
}

export function WorkspaceFormPanel({
  children,
  className,
  description,
  footer,
  title
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  footer?: ReactNode;
  title?: string;
}) {
  return (
    <WorkspaceFormSurface {...(className ? { className } : {})}>
      {title || description ? (
        <div className="border-b border-border/90 px-5 py-4">
          {title ? <h2 className="text-base font-medium text-foreground">{title}</h2> : null}
          {description ? (
            <p className={cn("text-sm text-muted-foreground", title && "mt-1")}>{description}</p>
          ) : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
      {footer ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-border/90 bg-muted/20 px-5 py-4">
          {footer}
        </div>
      ) : null}
    </WorkspaceFormSurface>
  );
}

export function WorkspaceFormSurface({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border/90 bg-card/95 shadow-[0_14px_34px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.06)] ring-1 ring-emerald-200/45",
        className
      )}
    >
      {children}
    </div>
  );
}

export function WorkspaceFormBody({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("px-4 py-5 sm:px-6 sm:py-6", className)}>{children}</div>;
}

export function WorkspaceFormTabbedBody({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <WorkspaceFormBody className={cn("pt-1 pb-10", className)}>{children}</WorkspaceFormBody>;
}

export function WorkspaceFormActions({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-t border-border/90 bg-card px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:px-6",
        className
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 [&>button]:w-full sm:[&>button]:w-auto">
        {children}
      </div>
    </div>
  );
}

export function WorkspaceFormBanner({
  children,
  className,
  title,
  tone = "error"
}: {
  children: ReactNode;
  className?: string;
  title: string;
  tone?: "error" | "info" | "warning";
}) {
  const Icon = tone === "warning" ? AlertTriangle : tone === "info" ? Info : AlertCircle;

  return (
    <div
      className={cn(
        "mb-4 flex gap-3 rounded-md border px-3 py-2.5 text-sm",
        tone === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
        tone === "warning" && "border-amber-300 bg-amber-50 text-amber-900",
        tone === "info" && "border-sky-300 bg-sky-50 text-sky-900",
        className
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <div className="mt-0.5 text-current/80">{children}</div>
      </div>
    </div>
  );
}

export function WorkspaceFormGrid({
  children,
  className,
  columns = 2
}: {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-6 gap-y-5",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 md:grid-cols-2",
        columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export function WorkspaceFormField({
  children,
  className,
  label,
  required
}: {
  children: ReactNode;
  className?: string;
  label: ReactNode;
  required?: boolean;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label className="text-sm font-medium text-muted-foreground">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function WorkspaceFormFooter({
  cancelLabel = "Cancel",
  children,
  className,
  onCancel,
  primaryLabel,
  primaryLoading,
  primaryProps
}: {
  cancelLabel?: string;
  children?: ReactNode;
  className?: string;
  onCancel?: () => void;
  primaryLabel: string;
  primaryLoading?: boolean;
  primaryProps?: React.ComponentProps<typeof Button>;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <Button type="submit" disabled={primaryLoading} className="rounded-md" {...primaryProps}>
        {primaryLabel}
      </Button>
      {children}
      {onCancel ? (
        <Button type="button" variant="outline" onClick={onCancel} className="rounded-md">
          {cancelLabel}
        </Button>
      ) : null}
    </div>
  );
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "../components/dialog";

export function WorkspaceUpsertDialog({
  children,
  className,
  description,
  onClose,
  open,
  title
}: {
  children: ReactNode;
  className?: string;
  description?: string;
  onClose?: () => void;
  open: boolean;
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className={cn("sm:max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
