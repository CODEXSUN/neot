"use client";

import * as React from "react";
import {
  BadgeCheckIcon,
  ChevronsUpDownIcon,
  type LucideIcon,
  LogOutIcon,
  MonitorCogIcon,
  PanelsTopLeftIcon
} from "lucide-react";

import { SidemenuSection, type SidemenuItem } from "./sub/sidemenu-section";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../../../components/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from "../../../components/sidebar";

type SidebarBrandOption = {
  id: string;
  logoDarkSrc?: string;
  logoSrc?: string;
  subtitle?: string;
  title: string;
};

export type SidebarBrand = {
  href?: string;
  logoAlt?: string;
  logoDarkSrc?: string;
  logoSrc?: string;
  options?: SidebarBrandOption[];
  optionsLabel?: string;
  onOptionSelect?: (id: string) => void;
  onSecondaryOptionSelect?: (id: string) => void;
  selectedOptionId?: string;
  selectedSecondaryOptionId?: string;
  secondaryOptions?: SidebarBrandOption[];
  secondaryOptionsLabel?: string;
  subtitle: string;
  title: string;
};

export type SidebarUser = {
  avatarSrc?: string;
  email: string;
  fallback: string;
  name: string;
};

export type SidebarUserMenuItem = {
  icon: LucideIcon;
  title: string;
  url?: string;
};

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  brand: SidebarBrand;
  items: SidemenuItem[];
  showUserMenu?: boolean;
  user: SidebarUser;
  userMenuItems?: SidebarUserMenuItem[];
  versionLabel?: string;
};

const defaultUserMenuItems: SidebarUserMenuItem[] = [
  {
    icon: BadgeCheckIcon,
    title: "Account"
  },
  {
    icon: MonitorCogIcon,
    title: "Notifications"
  },
  {
    icon: PanelsTopLeftIcon,
    title: "Super Admin login"
  },
  {
    icon: LogOutIcon,
    title: "Log out",
    url: "/login"
  }
];

export function AppSidebar({
  brand,
  className,
  items,
  showUserMenu = true,
  user,
  userMenuItems = defaultUserMenuItems,
  versionLabel = "v 1.0.1",
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" variant="inset" className={className} {...props}>
      <SidebarHeader>
        <SidebarBrandMenu brand={brand} />
      </SidebarHeader>
      <SidebarContent>
        <SidemenuSection items={items} />
      </SidebarContent>
      <SidebarFooter className="border-t">
        <div className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          {versionLabel}
        </div>
        {showUserMenu ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="h-14">
                    <Avatar className="size-9 border bg-background">
                      {user.avatarSrc ? <AvatarImage alt={user.name} src={user.avatarSrc} /> : null}
                      <AvatarFallback>{user.fallback}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                      <div className="truncate font-semibold">{user.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                    </div>
                    <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right" className="w-56 p-2">
                  <div className="flex items-center gap-3 p-2">
                    <Avatar className="size-9 border bg-background">
                      <AvatarFallback>{user.fallback}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{user.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {userMenuItems.map((item, index) => (
                    <React.Fragment key={item.title}>
                      {index === userMenuItems.length - 1 ? <DropdownMenuSeparator /> : null}
                      <DropdownMenuItem asChild={Boolean(item.url)}>
                        {item.url ? (
                          <a href={item.url}>
                            <item.icon />
                            {item.title}
                          </a>
                        ) : (
                          <>
                            <item.icon />
                            {item.title}
                          </>
                        )}
                      </DropdownMenuItem>
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function SidebarBrandMenu({ brand }: { brand: SidebarBrand }) {
  const options = brand.options ?? [];
  const secondaryOptions = brand.secondaryOptions ?? [];
  const active = options.find((option) => option.id === brand.selectedOptionId) ?? options[0];
  const current = active ?? brand;
  const trigger = (
    <SidebarMenuButton size="lg" tooltip={current.title} className="h-14">
      <BrandIdentity brand={current} fallback={brand} />
      {options.length || secondaryOptions.length ? (
        <ChevronsUpDownIcon className="ml-auto size-4 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden" />
      ) : null}
    </SidebarMenuButton>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {options.length || secondaryOptions.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-64 p-1">
              {brand.optionsLabel ? (
                <div className="px-2 pb-1 pt-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  {brand.optionsLabel}
                </div>
              ) : null}
              {options.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  onSelect={() => brand.onOptionSelect?.(option.id)}
                >
                  <BrandLogo brand={option} fallback={brand} compact />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{option.title}</div>
                    {option.subtitle ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {option.subtitle}
                      </div>
                    ) : null}
                  </div>
                  {option.id === brand.selectedOptionId ? (
                    <BadgeCheckIcon className="size-4 text-primary" />
                  ) : null}
                </DropdownMenuItem>
              ))}
              {options.length && secondaryOptions.length ? <DropdownMenuSeparator /> : null}
              {brand.secondaryOptionsLabel ? (
                <div className="px-2 pb-1 pt-1.5 text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  {brand.secondaryOptionsLabel}
                </div>
              ) : null}
              {secondaryOptions.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  onSelect={() => brand.onSecondaryOptionSelect?.(option.id)}
                >
                  <div className="min-w-0 flex-1 px-1">
                    <div className="truncate font-medium">{option.title}</div>
                    {option.subtitle ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {option.subtitle}
                      </div>
                    ) : null}
                  </div>
                  {option.id === brand.selectedSecondaryOptionId ? (
                    <BadgeCheckIcon className="size-4 text-primary" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <a href={brand.href ?? "/workspace"}>{trigger}</a>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function BrandIdentity({
  brand,
  fallback
}: {
  brand: {
    logoAlt?: string;
    logoDarkSrc?: string;
    logoSrc?: string;
    subtitle?: string;
    title: string;
  };
  fallback: SidebarBrand;
}) {
  return (
    <>
      <BrandLogo brand={brand} fallback={fallback} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
        <span className="truncate font-semibold text-primary">{brand.title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {brand.subtitle ?? fallback.subtitle}
        </span>
      </div>
    </>
  );
}

function BrandLogo({
  brand,
  compact = false,
  fallback
}: {
  brand: Pick<SidebarBrand, "logoAlt" | "logoDarkSrc" | "logoSrc" | "title">;
  compact?: boolean;
  fallback: SidebarBrand;
}) {
  const size = compact ? "size-7" : "size-8";
  const imageSize = compact ? "size-5" : "size-6";
  return (
    <div
      className={`flex aspect-square ${size} shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background`}
    >
      <img
        alt={brand.logoAlt ?? fallback.logoAlt ?? brand.title}
        className={`${imageSize} dark:hidden`}
        src={brand.logoSrc ?? fallback.logoSrc ?? "/logo/logo.svg"}
      />
      <img
        alt={brand.logoAlt ?? fallback.logoAlt ?? brand.title}
        className={`hidden ${imageSize} dark:block`}
        src={brand.logoDarkSrc ?? fallback.logoDarkSrc ?? "/logo/logo-dark.svg"}
      />
    </div>
  );
}
