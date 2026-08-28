"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  AppWindowIcon,
  BadgeCheckIcon,
  BriefcaseBusinessIcon,
  CreditCardIcon,
  Globe2Icon,
  LogOutIcon,
  MailIcon,
  MonitorCogIcon,
  PanelsTopLeftIcon,
  RefreshCwIcon,
  SparklesIcon,
  UsersRoundIcon,
  WalletCardsIcon
} from "lucide-react";

import {
  AppSidebar,
  type SidebarBrand,
  type SidebarUser,
  type SidebarUserMenuItem
} from "../blocks/menu/sidemenu/app-sidebar";
import { TopMenu, type TopMenuWorkspaceItem } from "../blocks/menu/sidemenu/top-menu";
import {
  TechmediaTopMenu,
  type TopMenuNotification
} from "../blocks/menu/sidemenu/techmedia-top-menu";
import type { GlobalSearchItem } from "../blocks/menu/sidemenu/global-search";
import type { SidemenuItem } from "../blocks/menu/sidemenu/sub/sidemenu-section";
import { SidebarInset, SidebarProvider } from "../components/sidebar";
import { ScreenCompanion, type ScreenCompanionConfig } from "../blocks/companion/screen-companion";
import { useMascotVisibility } from "../modules/mascot";

type AppLayoutProps = {
  brand?: SidebarBrand;
  children: ReactNode;
  companion?: ScreenCompanionConfig;
  deskVariant?: "standard" | "techmedia";
  headerTitle?: ReactNode;
  globalSearchItems?: GlobalSearchItem[];
  homeHref?: string;
  logoutHref?: string;
  menuItems?: SidemenuItem[];
  onLogout?: () => void | Promise<void>;
  notifications?: TopMenuNotification[];
  onNotificationRead?: (id: string) => void;
  profileHref?: string;
  showHomeAction?: boolean;
  showThemeAction?: boolean;
  subtitle?: ReactNode;
  showSidebarUser?: boolean;
  title?: ReactNode;
  user?: SidebarUser;
  userMenuItems?: SidebarUserMenuItem[];
  versionLabel?: string;
  workspaceItems?: TopMenuWorkspaceItem[];
  showPageTitle?: boolean;
};

export const defaultWorkspaceItems: TopMenuWorkspaceItem[] = [
  {
    title: "Application",
    description: "Shared workspace, company setup, and modules.",
    icon: BriefcaseBusinessIcon,
    url: "/workspace"
  },
  {
    title: "ZETRO",
    description: "Business assistance chat for teams.",
    icon: SparklesIcon,
    url: "/app"
  },
  {
    title: "Operations",
    description: "Tenant workspace and operational modules.",
    icon: AppWindowIcon,
    active: true,
    url: "/workspace"
  },
  {
    title: "Mail",
    description: "Reusable workspace mail services.",
    icon: MailIcon,
    url: "/app"
  },
  {
    title: "Tools",
    description: "Tenant tools and app extensions.",
    icon: Globe2Icon,
    url: "/app"
  }
];

export const defaultAppMenuItems: SidemenuItem[] = [
  {
    title: "Admin",
    url: "/workspace",
    icon: WalletCardsIcon,
    isActive: true,
    items: [
      {
        title: "Master Modules",
        url: "/workspace"
      },
      {
        title: "Platform Masters",
        url: "/admin"
      },
      {
        title: "Security Surface",
        url: "/app"
      }
    ]
  },
  {
    title: "Application",
    url: "/app",
    icon: UsersRoundIcon
  },
  {
    title: "Domain",
    url: "/status",
    icon: Globe2Icon
  },
  {
    title: "Subscription",
    url: "/admin",
    icon: CreditCardIcon
  },
  {
    title: "Apps",
    url: "/workspace",
    icon: AppWindowIcon
  },
  {
    title: "Compliance",
    url: "/status",
    icon: RefreshCwIcon
  }
];

export const defaultSidebarBrand: SidebarBrand = {
  href: "/workspace",
  subtitle: "super-admin",
  title: "Super Admin Desk"
};

export const defaultSidebarUser: SidebarUser = {
  email: "user@codexsun.app",
  fallback: "U",
  name: "User"
};

export const defaultUserMenuItems: SidebarUserMenuItem[] = [
  {
    icon: SparklesIcon,
    title: "Upgrade to Pro"
  },
  {
    icon: BadgeCheckIcon,
    title: "Account"
  },
  {
    icon: AppWindowIcon,
    title: "Workspace"
  },
  {
    icon: MonitorCogIcon,
    title: "Notifications"
  },
  {
    icon: PanelsTopLeftIcon,
    title: "Super Admin login",
    url: "/sa"
  },
  {
    icon: LogOutIcon,
    title: "Log out",
    url: "/login"
  }
];

export function AppLayout({
  brand = defaultSidebarBrand,
  children,
  companion,
  deskVariant = "standard",
  headerTitle = "Documents",
  globalSearchItems = [],
  homeHref = "/workspace",
  logoutHref = "/login",
  menuItems = defaultAppMenuItems,
  onLogout,
  notifications,
  onNotificationRead,
  profileHref,
  showHomeAction = true,
  showThemeAction = true,
  showSidebarUser = true,
  subtitle,
  title,
  user = defaultSidebarUser,
  userMenuItems = defaultUserMenuItems,
  versionLabel = "v 1.0.1",
  workspaceItems = defaultWorkspaceItems,
  showPageTitle = true
}: AppLayoutProps) {
  const [companionVisible, setCompanionVisible] = useMascotVisibility(Boolean(companion));

  if (deskVariant === "techmedia") {
    return (
      <SidebarProvider className="flex-col" style={{ "--sidebar-width": "19rem" } as CSSProperties}>
        <TechmediaTopMenu
          {...(companion ? { companionLabel: companion.label } : {})}
          companionVisible={companionVisible}
          globalSearchItems={globalSearchItems}
          homeHref={homeHref}
          logoutHref={logoutHref}
          {...(onLogout ? { onLogout } : {})}
          {...(notifications ? { notifications } : {})}
          {...(onNotificationRead ? { onNotificationRead } : {})}
          onCompanionVisibleChange={setCompanionVisible}
          pageTitle={String(headerTitle)}
          {...(profileHref ? { profileHref } : {})}
          showHomeAction={showHomeAction}
          showPageTitle={showPageTitle}
          showThemeAction={showThemeAction}
          user={user}
          workspaceItems={workspaceItems}
        />
        {companion ? <ScreenCompanion {...companion} visible={companionVisible} /> : null}
        <div className="flex min-h-0 flex-1">
          <AppSidebar
            brand={brand}
            className="md:!bottom-auto md:!top-14 md:!h-[calc(100svh-3.5rem)] md:!p-1"
            items={menuItems}
            showUserMenu={showSidebarUser}
            user={user}
            userMenuItems={userMenuItems}
            variant="inset"
            versionLabel={versionLabel}
          />
          <SidebarInset className="md:!m-0 md:!rounded-none md:!border-0 md:!shadow-none">
            <AppLayoutContent subtitle={subtitle} title={title}>
              {children}
            </AppLayoutContent>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "19rem"
        } as CSSProperties
      }
    >
      <AppSidebar
        brand={brand}
        items={menuItems}
        showUserMenu={showSidebarUser}
        user={user}
        userMenuItems={userMenuItems}
        variant="inset"
        versionLabel={versionLabel}
      />
      <SidebarInset>
        <TopMenu
          homeHref={homeHref}
          logoutHref={logoutHref}
          {...(onLogout ? { onLogout } : {})}
          pageTitle={String(headerTitle)}
          {...(profileHref ? { profileHref } : {})}
          showHomeAction={showHomeAction}
          showThemeAction={showThemeAction}
          showPageTitle={showPageTitle}
          user={user}
          workspaceItems={workspaceItems}
        />
        <AppLayoutContent subtitle={subtitle} title={title}>
          {children}
        </AppLayoutContent>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AppLayoutContent({
  children,
  subtitle,
  title
}: Pick<AppLayoutProps, "children" | "subtitle" | "title">) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        {title || subtitle ? (
          <div className="border-b bg-background px-4 py-5 lg:px-6">
            {title ? <h2 className="m-0 text-2xl font-semibold leading-tight">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
