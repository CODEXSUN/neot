"use client";

import { ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/tooltip";

export function WorkspaceProtectedIndicator({
  label = "Protected and locked"
}: {
  label?: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label={label}
            className="inline-flex size-8 cursor-help items-center justify-center rounded-md border border-amber-300 bg-amber-50 text-amber-700"
            role="img"
            tabIndex={0}
          >
            <ShieldCheck className="size-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="left">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
