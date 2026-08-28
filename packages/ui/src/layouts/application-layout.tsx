import type { ReactNode } from "react";
import {
  BookOpenIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MailIcon,
  Settings2Icon,
  StoreIcon
} from "lucide-react";

import { AppLayout } from "./app-layout";
import type { SidebarBrand, SidebarUser } from "../blocks/menu/sidemenu/app-sidebar";
import type { TopMenuWorkspaceItem } from "../blocks/menu/sidemenu/top-menu";
import type { GlobalSearchItem } from "../blocks/menu/sidemenu/global-search";
import type { SidemenuItem } from "../blocks/menu/sidemenu/sub/sidemenu-section";
import type { ScreenCompanionConfig } from "../blocks/companion/screen-companion";
import type { TopMenuNotification } from "../blocks/menu/sidemenu/techmedia-top-menu";

type ApplicationLayoutProps = {
  actions?: ReactNode;
  brand?: SidebarBrand;
  children: ReactNode;
  companion?: ScreenCompanionConfig;
  deskVariant?: "standard" | "techmedia";
  menuItems?: SidemenuItem[];
  headerTitle?: ReactNode;
  globalSearchItems?: GlobalSearchItem[];
  homeHref?: string;
  onLogout?: () => void | Promise<void>;
  notifications?: TopMenuNotification[];
  onNotificationRead?: (id: string) => void;
  profileHref?: string;
  showHomeAction?: boolean;
  showSidebarUser?: boolean;
  showThemeAction?: boolean;
  subtitle?: ReactNode;
  title?: ReactNode;
  user?: SidebarUser;
  versionLabel?: string;
  workspaceItems?: TopMenuWorkspaceItem[];
};

const applicationMenuItems: SidemenuItem[] = [
  {
    title: "Application",
    url: "/app",
    icon: StoreIcon,
    isActive: true,
    items: [
      {
        title: "Landing Desk",
        url: "/app"
      },
      {
        title: "Company",
        url: "/app/company"
      },
      {
        title: "Settings",
        url: "/app/settings"
      }
    ]
  },
  {
    title: "Settings",
    url: "/app/settings",
    icon: Settings2Icon
  }
];

const applicationWorkspaceItems = [
  {
    title: "Application",
    description: "Company setup, users, roles, settings, and landing desk.",
    icon: StoreIcon,
    active: true,
    url: "/app"
  },
  {
    title: "Mail",
    description: "Reusable workspace mail services.",
    icon: MailIcon,
    url: "/app"
  },
  {
    title: "Knowledge",
    description: "Application documents, guides, and shared notes.",
    icon: BookOpenIcon,
    url: "/app"
  }
];

export function ApplicationLayout({
  actions,
  brand,
  children,
  companion,
  deskVariant = "standard",
  headerTitle = "Overview",
  globalSearchItems = [],
  homeHref = "/",
  menuItems = applicationMenuItems,
  onLogout,
  notifications,
  onNotificationRead,
  profileHref,
  showHomeAction = true,
  showSidebarUser = true,
  showThemeAction = true,
  subtitle = "Tenant application workspace.",
  title = "Application Desk",
  user,
  versionLabel,
  workspaceItems = applicationWorkspaceItems
}: ApplicationLayoutProps) {
  return (
    <AppLayout
      brand={{
        ...brand,
        href: brand?.href ?? "/app",
        subtitle: brand?.subtitle ?? "application workspace",
        title: brand?.title ?? "Application Desk"
      }}
      deskVariant={deskVariant}
      {...(companion ? { companion } : {})}
      globalSearchItems={globalSearchItems}
      headerTitle={headerTitle}
      homeHref={homeHref}
      logoutHref="/login"
      menuItems={menuItems}
      {...(onLogout ? { onLogout } : {})}
      {...(notifications ? { notifications } : {})}
      {...(onNotificationRead ? { onNotificationRead } : {})}
      {...(profileHref ? { profileHref } : {})}
      showHomeAction={showHomeAction}
      showSidebarUser={showSidebarUser}
      showThemeAction={showThemeAction}
      subtitle={subtitle}
      title={title}
      {...(user ? { user } : {})}
      {...(versionLabel ? { versionLabel } : {})}
      userMenuItems={[
        {
          icon: LifeBuoyIcon,
          title: "Support",
          url: "/status"
        },
        {
          icon: Settings2Icon,
          title: "Account",
          url: "/app/settings"
        },
        {
          icon: LogOutIcon,
          title: "Log out",
          url: "/login"
        }
      ]}
      workspaceItems={workspaceItems}
    >
      {actions ? <div className="px-4 pt-4 lg:px-6">{actions}</div> : null}
      <div className="min-w-0 flex-1">{children}</div>
    </AppLayout>
  );
}
