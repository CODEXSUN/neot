import type { ReactNode } from "react";
import {
  BellIcon,
  ClipboardCheckIcon,
  LifeBuoyIcon,
  LogOutIcon,
  MonitorCogIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  UsersRoundIcon,
  WalletCardsIcon
} from "lucide-react";

import { AppLayout } from "./app-layout";
import type { SidemenuItem } from "../blocks/menu/sidemenu/sub/sidemenu-section";

type AdminLayoutProps = {
  actions?: ReactNode;
  children: ReactNode;
  homeHref?: string;
  onLogout?: () => void | Promise<void>;
  subtitle?: ReactNode;
  title?: ReactNode;
  versionLabel?: string;
};

const adminMenuItems: SidemenuItem[] = [
  {
    title: "Support",
    url: "/admin",
    icon: LifeBuoyIcon,
    isActive: true,
    items: [
      {
        title: "Support Queue",
        url: "/admin"
      },
      {
        title: "Activation Review",
        url: "/admin"
      },
      {
        title: "Client Health",
        url: "/status"
      }
    ]
  },
  {
    title: "Application",
    url: "/app",
    icon: UsersRoundIcon
  },
  {
    title: "System Status",
    url: "/status",
    icon: StethoscopeIcon
  },
  {
    title: "Notifications",
    url: "/admin",
    icon: BellIcon
  },
  {
    title: "Compliance",
    url: "/status",
    icon: ClipboardCheckIcon
  }
];

const adminWorkspaceItems = [
  {
    title: "Staff Admin",
    description: "Support, activation, and client operations.",
    icon: WalletCardsIcon,
    active: true,
    url: "/admin"
  },
  {
    title: "Application",
    description: "Tenant application workspace.",
    icon: UsersRoundIcon,
    url: "/app"
  },
  {
    title: "Status",
    description: "Platform health, API state, and service checks.",
    icon: MonitorCogIcon,
    url: "/status"
  }
];

export function AdminLayout({
  actions,
  children,
  homeHref = "/",
  onLogout,
  subtitle = "Internal staff workspace for support and operations.",
  title = "Staff Admin Desk",
  versionLabel
}: AdminLayoutProps) {
  return (
    <AppLayout
      brand={{
        href: "/admin",
        subtitle: "staff-admin",
        title: "Staff Admin Desk"
      }}
      headerTitle="Staff Admin Desk"
      homeHref={homeHref}
      logoutHref="/admin/login"
      menuItems={adminMenuItems}
      {...(onLogout ? { onLogout } : {})}
      subtitle={subtitle}
      title={title}
      {...(versionLabel ? { versionLabel } : {})}
      user={{
        email: "Configured in environment",
        fallback: "A",
        name: "Staff Admin"
      }}
      userMenuItems={[
        {
          icon: ShieldCheckIcon,
          title: "Account"
        },
        {
          icon: MonitorCogIcon,
          title: "Notifications"
        },
        {
          icon: LifeBuoyIcon,
          title: "Support Desk",
          url: "/admin"
        },
        {
          icon: LogOutIcon,
          title: "Log out",
          url: "/admin/login"
        }
      ]}
      workspaceItems={adminWorkspaceItems}
    >
      {actions ? <div className="px-4 pt-4 lg:px-6">{actions}</div> : null}
      <div>{children}</div>
    </AppLayout>
  );
}
