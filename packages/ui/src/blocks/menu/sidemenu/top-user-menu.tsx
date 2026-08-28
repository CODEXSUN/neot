"use client";

import { ChevronDownIcon, LogOutIcon, UserRoundIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "../../../components/avatar";
import { Button } from "../../../components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../../../components/dropdown-menu";

export type TopUserMenuUser = {
  avatarSrc?: string;
  email: string;
  fallback: string;
  name: string;
};

export type TopUserMenuProps = {
  logoutHref?: string;
  onLogout?: () => void | Promise<void>;
  profileHref?: string;
  user: TopUserMenuUser;
};

export function TopUserMenu({
  logoutHref = "/login",
  onLogout,
  profileHref,
  user
}: TopUserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`User menu for ${user.name}`}
          size="sm"
          variant="outline"
          className="h-8 min-w-8 max-w-48 gap-2 px-1.5 sm:px-2.5"
        >
          <Avatar className="size-6">
            {user.avatarSrc ? <AvatarImage alt={user.name} src={user.avatarSrc} /> : null}
            <AvatarFallback className="text-[0.65rem] font-semibold">
              {user.fallback}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 flex-1 truncate text-left sm:inline">{user.name}</span>
          <ChevronDownIcon className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-md p-2">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-2.5">
            <Avatar className="size-9">
              {user.avatarSrc ? <AvatarImage alt={user.name} src={user.avatarSrc} /> : null}
              <AvatarFallback className="text-xs font-semibold">{user.fallback}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profileHref ? (
          <DropdownMenuItem asChild>
            <a href={profileHref}>
              <UserRoundIcon />
              Profile
            </a>
          </DropdownMenuItem>
        ) : null}
        {onLogout ? (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              void onLogout();
            }}
          >
            <LogOutIcon />
            Logout
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <a href={logoutHref}>
              <LogOutIcon />
              Logout
            </a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
