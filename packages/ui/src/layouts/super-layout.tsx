import type { ReactNode } from "react";
import {
  KeyRoundIcon,
  ListChecksIcon,
  LogOutIcon,
  ShieldCheckIcon,
  WalletCardsIcon
} from "lucide-react";

import { AppLayout } from "./app-layout";
import type { SidemenuItem } from "../blocks/menu/sidemenu/sub/sidemenu-section";

type SuperLayoutProps = {
  actions?: ReactNode;
  children: ReactNode;
  homeHref?: string;
  menuItems?: SidemenuItem[];
  onLogout?: () => void | Promise<void>;
  subtitle?: ReactNode;
  title?: ReactNode;
  versionLabel?: string;
  workspace?: "platform" | "task-manager";
};

const superMenuItems: SidemenuItem[] = [
  {
    title: "Admin",
    url: "/sa",
    icon: WalletCardsIcon,
    isActive: true,
    items: [
      {
        title: "Console",
        url: "/sa"
      },
      {
        title: "Application",
        url: "/app"
      },
      {
        title: "Domain",
        url: "/status"
      },
      {
        title: "Subscription",
        url: "/admin"
      },
      {
        title: "Apps",
        url: "/sa"
      },
      {
        title: "Compliance",
        url: "/status"
      },
      {
        title: "Master Database",
        url: "/status"
      },
      {
        title: "Access Control",
        url: "/admin"
      }
    ]
  }
];

function superWorkspaceItems(activeWorkspace: "platform" | "task-manager") {
  return [
    {
      title: "Platform",
      description: "Master database, tenants, domains, and controls.",
      icon: ShieldCheckIcon,
      active: activeWorkspace === "platform",
      url: "/sa"
    },
    {
      title: "Task Manager",
      description: "Super Admin Todo planning and operational follow-up.",
      icon: ListChecksIcon,
      active: activeWorkspace === "task-manager",
      url: "/sa/task-manager"
    }
  ];
}

export function SuperLayout({
  actions,
  children,
  homeHref = "/",
  menuItems = superMenuItems,
  onLogout,
  subtitle,
  title,
  versionLabel,
  workspace = "platform"
}: SuperLayoutProps) {
  return (
    <AppLayout
      brand={{
        href: "/sa",
        subtitle: "super-admin",
        title: "Super Admin Desk"
      }}
      headerTitle="Super Admin Desk"
      showPageTitle={false}
      homeHref={homeHref}
      logoutHref="/sa/login"
      menuItems={menuItems}
      {...(onLogout ? { onLogout } : {})}
      subtitle={subtitle}
      title={title}
      user={{
        email: "Configured in environment",
        fallback: "S",
        name: "Super Admin"
      }}
      {...(versionLabel ? { versionLabel } : {})}
      userMenuItems={[
        {
          icon: ShieldCheckIcon,
          title: "Account"
        },
        {
          icon: KeyRoundIcon,
          title: "Access Control",
          url: "/sa"
        },
        {
          icon: LogOutIcon,
          title: "Log out",
          url: "/sa/login"
        }
      ]}
      workspaceItems={superWorkspaceItems(workspace)}
    >
      {actions ? <div className="px-4 pt-4 lg:px-6">{actions}</div> : null}
      <div className="flex-1">{children}</div>
    </AppLayout>
  );
}
