"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "../../../../lib/utils";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "../../../../components/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from "../../../../components/sidebar";

export type SidemenuSubItem = {
  icon?: LucideIcon;
  isActive?: boolean;
  items?: SidemenuSubItem[];
  onSelect?: () => void;
  title: string;
  url?: string;
};

export type SidemenuItem = {
  badge?: number | string;
  prominent?: boolean;
  title: string;
  url?: string;
  icon: LucideIcon;
  isActive?: boolean;
  onSelect?: () => void;
  items?: SidemenuSubItem[];
};

export function SidemenuSection({ items, title }: { items: SidemenuItem[]; title?: string }) {
  return (
    <SidebarGroup>
      {title ? <SidebarGroupLabel>{title}</SidebarGroupLabel> : null}
      <SidebarMenu>
        {items.map((item) => {
          const subItems = item.items ?? [];
          const hasItems = subItems.length > 0;

          return (
            <Collapsible
              key={`${item.title}-${item.isActive ? "active" : "idle"}`}
              asChild
              defaultOpen={item.isActive ?? false}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                {hasItems ? (
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      <SidemenuChevron className="group-data-[collapsible=icon]:hidden group-data-[state=open]/collapsible:rotate-45" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                ) : (
                  <SidebarMenuButton
                    asChild
                    isActive={item.isActive ?? false}
                    tooltip={item.title}
                    className={cn(
                      item.prominent &&
                        "mb-2 h-10 bg-primary font-semibold text-primary-foreground shadow-sm hover:translate-x-0 hover:bg-primary/90 hover:text-primary-foreground hover:shadow-md data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-md"
                    )}
                  >
                    {item.onSelect ? (
                      <button type="button" onClick={item.onSelect}>
                        <item.icon />
                        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </button>
                    ) : (
                      <a href={item.url ?? "#"}>
                        <item.icon />
                        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </a>
                    )}
                  </SidebarMenuButton>
                )}
                {!hasItems && item.badge !== undefined ? (
                  <SidebarMenuBadge className="rounded-full bg-primary text-primary-foreground">
                    {item.badge}
                  </SidebarMenuBadge>
                ) : null}
                {hasItems ? (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {subItems.map((subItem) => (
                        <SidemenuSubItemNode key={subItem.title} item={subItem} />
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function SidemenuSubItemNode({ item }: { item: SidemenuSubItem }) {
  const children = item.items ?? [];
  const hasChildren = children.length > 0;
  const childActive = children.some(
    (child) => child.isActive || child.items?.some((nested) => nested.isActive)
  );
  const active = item.isActive ?? childActive;
  const Icon = item.icon;

  if (hasChildren) {
    return (
      <SidebarMenuSubItem>
        <Collapsible asChild defaultOpen={active} className="group/sub-collapsible">
          <div>
            <CollapsibleTrigger asChild>
              <SidebarMenuSubButton asChild isActive={active}>
                <button type="button">
                  {Icon ? <Icon className="size-4 shrink-0" /> : null}
                  <span>{item.title}</span>
                  <SidemenuChevron className="group-data-[state=open]/sub-collapsible:rotate-45" />
                </button>
              </SidebarMenuSubButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub className="mx-2 mr-0 gap-0.5 py-0.5">
                {children.map((child) => (
                  <SidemenuSubItemNode key={child.title} item={child} />
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </SidebarMenuSubItem>
    );
  }

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={active}>
        {item.onSelect ? (
          <button type="button" onClick={item.onSelect}>
            {Icon ? <Icon className="size-4 shrink-0" /> : null}
            <span>{item.title}</span>
          </button>
        ) : (
          <a href={item.url ?? "#"}>
            {Icon ? <Icon className="size-4 shrink-0" /> : null}
            <span>{item.title}</span>
          </a>
        )}
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function SidemenuChevron({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`ml-auto size-2 shrink-0 rotate-[-45deg] border-b border-r border-muted-foreground transition-transform duration-200 ${className}`}
    />
  );
}
