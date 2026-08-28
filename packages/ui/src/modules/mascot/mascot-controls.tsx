"use client";

import {
  CheckIcon,
  EllipsisVerticalIcon,
  MapPinIcon,
  MessageCircleIcon,
  MoveHorizontalIcon,
  PauseIcon,
  RotateCcwIcon
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "../../components/dropdown-menu";
import type { MascotBehavior } from "./mascot.contract";

export function MascotControls({
  behavior,
  chatHref,
  onChatOpen,
  onBehaviorChange,
  onPinPosition,
  onResetPosition,
  positionPinned
}: {
  behavior: MascotBehavior;
  chatHref?: string;
  onChatOpen?: () => void;
  onBehaviorChange: (behavior: MascotBehavior) => void;
  onPinPosition: () => void;
  onResetPosition: () => void;
  positionPinned: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Honey movement options"
          className="pointer-events-none absolute left-[calc(100%-0.25rem)] top-1/2 flex size-8 -translate-y-1/2 scale-90 items-center justify-center rounded-full border border-amber-200/70 bg-[#fffaf0]/95 text-amber-800 opacity-0 shadow-md transition duration-200 hover:scale-105 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-visible:pointer-events-auto group-focus-visible:scale-100 group-focus-visible:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:scale-100 data-[state=open]:opacity-100 dark:border-amber-200/15 dark:bg-[#272219]/95 dark:text-amber-100"
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          <EllipsisVerticalIcon className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-48 rounded-2xl border-amber-200/70 bg-[#fffaf0]/98 p-1.5 dark:border-amber-200/15 dark:bg-[#272219]/98"
        side="right"
        sideOffset={8}
      >
        <DropdownMenuLabel className="px-3 text-xs text-muted-foreground">
          Honey movement
        </DropdownMenuLabel>
        <MovementItem
          active={behavior === "stay"}
          icon={PauseIcon}
          label="Stay in place"
          onSelect={() => onBehaviorChange("stay")}
        />
        <MovementItem
          active={behavior === "roam"}
          icon={MoveHorizontalIcon}
          label="Roam left and right"
          onSelect={() => onBehaviorChange("roam")}
        />
        <DropdownMenuLabel className="px-3 pt-2 text-xs text-muted-foreground">
          Honey position
        </DropdownMenuLabel>
        <MovementItem
          active={positionPinned}
          icon={MapPinIcon}
          label="Use current at startup"
          onSelect={onPinPosition}
        />
        <DropdownMenuItem className="h-10 rounded-xl px-3" onSelect={onResetPosition}>
          <RotateCcwIcon />
          <span>Use page default</span>
        </DropdownMenuItem>
        {chatHref ? (
          <>
            <DropdownMenuLabel className="px-3 pt-2 text-xs text-muted-foreground">
              Honey assistant
            </DropdownMenuLabel>
            <DropdownMenuItem className="h-10 rounded-xl px-3" onSelect={() => onChatOpen?.()}>
              <MessageCircleIcon />
              <span>Quick chat</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="h-10 rounded-xl px-3">
              <a href={chatHref}>
                <MessageCircleIcon />
                <span>Open Honey Chat</span>
              </a>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MovementItem({
  active,
  icon: Icon,
  label,
  onSelect
}: {
  active: boolean;
  icon: typeof PauseIcon;
  label: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem className="h-10 rounded-xl px-3" onSelect={onSelect}>
      <Icon />
      <span className="flex-1">{label}</span>
      {active ? <CheckIcon className="text-amber-700" /> : null}
    </DropdownMenuItem>
  );
}
