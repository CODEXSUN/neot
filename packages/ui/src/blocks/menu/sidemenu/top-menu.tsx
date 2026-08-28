"use client";

import {
  BellIcon,
  BriefcaseBusinessIcon,
  CheckIcon,
  ChevronDownIcon,
  HomeIcon,
  type LucideIcon,
  MailIcon,
  PaletteIcon,
  SparklesIcon,
  WrenchIcon
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "../../../components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../../../components/dropdown-menu";
import { Separator } from "../../../components/separator";
import { SidebarTrigger } from "../../../components/sidebar";
import {
  DESIGN_SYSTEM_DEFAULT_STORAGE_KEY,
  DESIGN_SYSTEM_NAME,
  DESIGN_SYSTEM_VARIANT_MARKER,
  defaultDesignSystemVariantId,
  designSystemVariants,
  isDesignSystemVariantId,
  type DesignSystemVariantId
} from "../../../design-system";
import { TopUserMenu, type TopUserMenuUser } from "./top-user-menu";

export type TopMenuWorkspaceItem = {
  active?: boolean;
  avatar?: boolean;
  description: string;
  icon: LucideIcon;
  onSelect?: () => void;
  title: string;
  url?: string;
};

export type TopMenuProps = {
  homeHref?: string;
  logoutHref?: string;
  onLogout?: () => void | Promise<void>;
  pageTitle?: string;
  profileHref?: string;
  showHomeAction?: boolean;
  showThemeAction?: boolean;
  user: TopUserMenuUser;
  workspaceItems?: TopMenuWorkspaceItem[];
  showPageTitle?: boolean;
};

const defaultWorkspaceItems: TopMenuWorkspaceItem[] = [
  {
    title: "Application",
    description: "Shared workspace, company setup, and modules.",
    icon: BriefcaseBusinessIcon
  },
  {
    title: "ZETRO",
    description: "Business assistance chat for teams.",
    icon: SparklesIcon
  },
  {
    title: "Operations",
    description: "Tenant workspace and operational modules.",
    icon: WrenchIcon,
    active: true
  },
  {
    title: "Mail",
    description: "Reusable workspace mail services.",
    icon: MailIcon
  },
  {
    title: "Tools",
    description: "Tenant tools and app extensions.",
    icon: WrenchIcon
  }
];

export function TopMenu({
  homeHref = "/workspace",
  logoutHref = "/login",
  onLogout,
  pageTitle = "Workspace",
  profileHref,
  showHomeAction = true,
  showThemeAction = true,
  user,
  workspaceItems = defaultWorkspaceItems,
  showPageTitle = true
}: TopMenuProps) {
  const activeWorkspace = workspaceItems.find((item) => item.active) ?? workspaceItems[0];
  const ActiveWorkspaceIcon = activeWorkspace?.icon ?? BriefcaseBusinessIcon;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between rounded-t-lg border-b bg-background">
      <div className="flex h-full min-w-0 items-center overflow-hidden">
        <div className="flex h-full w-16 items-center justify-center rounded-tl-lg border-r bg-background">
          <SidebarTrigger className="size-8 rounded-md border bg-background shadow-none" />
        </div>
        <div className="flex min-w-0 items-center gap-3 px-4 text-sm">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex min-w-0 max-w-36 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground sm:max-w-none">
                <ActiveWorkspaceIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{activeWorkspace?.title ?? "Workspace"}</span>
                <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-2">
              <DropdownMenuLabel className="px-2 text-xs font-medium text-muted-foreground">
                Switch app
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspaceItems.map((item) => (
                <DropdownMenuItem
                  key={item.title}
                  asChild={Boolean(item.url && !item.onSelect)}
                  className="gap-3 p-2"
                  {...(item.onSelect
                    ? {
                        onSelect: (event) => {
                          event.preventDefault();
                          item.onSelect?.();
                        }
                      }
                    : {})}
                >
                  {item.url && !item.onSelect ? (
                    <a href={item.url}>
                      <div className="flex size-8 items-center justify-center rounded-md border bg-background">
                        <item.icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{item.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                      {item.active ? <CheckIcon className="size-4" /> : null}
                    </a>
                  ) : (
                    <button type="button" className="flex w-full items-center gap-3 text-left">
                      <div className="flex size-8 items-center justify-center rounded-md border bg-background">
                        <item.icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{item.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                      {item.active ? <CheckIcon className="size-4" /> : null}
                    </button>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {showPageTitle ? (
            <>
              <Separator orientation="vertical" className="hidden h-4 sm:block" />
              <span className="hidden truncate font-medium sm:inline">{pageTitle}</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2 px-3">
        <Button aria-label="Notifications" size="icon" variant="outline" className="size-8">
          <BellIcon />
        </Button>
        {showHomeAction ? (
          <Button asChild size="sm" variant="outline" className="hidden h-8 px-3 sm:inline-flex">
            <a href={homeHref}>
              <HomeIcon />
              Home
            </a>
          </Button>
        ) : null}
        <TopUserMenu
          logoutHref={logoutHref}
          {...(onLogout ? { onLogout } : {})}
          {...(profileHref ? { profileHref } : {})}
          user={user}
        />
        {showThemeAction ? <DesignThemeMenu /> : null}
      </div>
    </header>
  );
}

export function DesignThemeMenu({ rounded = false }: { rounded?: boolean }) {
  const [activeVariantId, setActiveVariantId] = useState<DesignSystemVariantId>(() =>
    getStoredTheme()
  );

  useEffect(() => {
    applyTheme(activeVariantId);
  }, [activeVariantId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Theme"
          className={rounded ? "size-9 rounded-full" : "size-8"}
          size="icon"
          variant="outline"
        >
          <PaletteIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-md p-2">
        <DropdownMenuLabel className="px-2 text-xs font-medium text-muted-foreground">
          Design theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {designSystemVariants.map((variant) => {
          const active = variant.id === activeVariantId;
          return (
            <DropdownMenuItem
              key={variant.id}
              className="gap-3 rounded-md p-2"
              onSelect={() => setActiveVariantId(variant.id)}
            >
              <div className="flex -space-x-1">
                {variant.palette.slice(0, 4).map((color) => (
                  <span
                    key={color}
                    className="size-4 rounded-full border border-background shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{variant.name}</div>
                <div className="truncate text-xs text-muted-foreground">{variant.density}</div>
              </div>
              {active ? <CheckIcon className="size-4" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getStoredTheme(): DesignSystemVariantId {
  if (typeof window === "undefined") {
    return defaultDesignSystemVariantId;
  }

  const stored = window.localStorage.getItem(DESIGN_SYSTEM_DEFAULT_STORAGE_KEY);
  return stored && isDesignSystemVariantId(stored) ? stored : defaultDesignSystemVariantId;
}

function applyTheme(variantId: DesignSystemVariantId) {
  if (typeof window === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-design-system", DESIGN_SYSTEM_NAME);
  document.documentElement.setAttribute(DESIGN_SYSTEM_VARIANT_MARKER, variantId);
  window.localStorage.setItem(DESIGN_SYSTEM_DEFAULT_STORAGE_KEY, variantId);
}
