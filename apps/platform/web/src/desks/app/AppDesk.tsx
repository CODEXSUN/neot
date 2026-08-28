import { Suspense, useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon, Settings2Icon, ShieldCheckIcon } from "lucide-react";
import { neotWebBundle } from "@neot/neot-web";
import { honeyChatClient } from "@neot/neot-web/modules/honey";
import { useNotificationCenter } from "@neot/neot-web/modules/notification";
import { GlobalLoader } from "@neot/ui/components/global-loader";
import { ApplicationLayout } from "@neot/ui/layouts/application-layout";
import type { SidemenuItem } from "@neot/ui/blocks/menu/sidemenu/sub/sidemenu-section";
import type { GlobalSearchItem } from "@neot/ui/blocks/menu/sidemenu/global-search";
import { AuthGate } from "../../shared/auth/AuthGate";
import { getToken, logout } from "../../shared/api/platform-api";
import {
  applicationEntryPath,
  canAccessAdministratorSettings,
  canSelectApplicationTheme
} from "./app-shell-access";
import { UserWorkspace } from "../../modules/user";
import { RoleWorkspace } from "../../modules/role";
import { PermissionWorkspace } from "../../modules/permission";
import { RolePermissionWorkspace } from "../../modules/role-permission";
import { UserProfileWorkspace } from "../../modules/user/user.profile.workspace";
import { ApplicationSettingsWorkspace } from "./application-settings.workspace";

type IdentityPage =
  | "identity.users"
  | "identity.roles"
  | "identity.permissions"
  | "identity.access"
  | "identity.profile";

type Claims = { email: string; name?: string; permissions?: string[]; role?: string };

export function AppDesk() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const claims = readClaims();
  const notifications = useNotificationCenter();
  const [honeyVisible, setHoneyVisible] = useState(
    () => window.localStorage.getItem("neot.screen-companion.visible") !== "false"
  );
  const administrator = canAccessAdministratorSettings(claims.role);
  const identityPage = identityPageFromPath(pathname);
  const workspace = neotWebBundle.resolveWorkspace(pathname);
  const showingSettings = pathname === "/app/settings";
  const invalidIdentityPage = Boolean(
    identityPage && identityPage !== "identity.profile" && !administrator
  );
  const invalidPath = !workspace && !identityPage && !showingSettings;

  useEffect(() => {
    if (invalidIdentityPage || invalidPath) {
      void navigate({ replace: true, to: applicationEntryPath() });
    }
  }, [invalidIdentityPage, invalidPath, navigate]);

  useEffect(() => {
    if (pathname !== "/app/neot/honey") {
      window.sessionStorage.setItem("neot.honey.last-page", pathname);
    }
  }, [pathname]);

  const showingIdentity = Boolean(identityPage && !invalidIdentityPage);
  const headerTitle = showingSettings
    ? "Clear cache"
    : showingIdentity
      ? identityTitle(identityPage!)
      : (workspace?.title ?? "App Desk");
  const globalSearchItems = buildGlobalSearchItems(administrator);

  return (
    <AuthGate>
      <ApplicationLayout
        brand={{
          logoAlt: "NEOT",
          logoDarkSrc: "/logo/logo-dark.svg",
          logoSrc: "/logo/logo.svg",
          subtitle: "Learn today. Own tomorrow.",
          title: "NEOT"
        }}
        companion={{
          chat: honeyChatClient,
          label: "Honey",
          spriteSheetUrl: "/pets/honey/spritesheet.webp"
        }}
        deskVariant="techmedia"
        globalSearchItems={globalSearchItems}
        headerTitle={headerTitle}
        menuItems={
          showingIdentity
            ? buildIdentityMenu(identityPage!, navigate, administrator)
            : buildApplicationMenu(workspace?.id ?? "", honeyVisible, () => {
                const next = !honeyVisible;
                setHoneyVisible(next);
                window.localStorage.setItem("neot.screen-companion.visible", String(next));
                window.dispatchEvent(
                  new CustomEvent("neot:screen-companion-visibility", { detail: next })
                );
              })
        }
        onLogout={async () => {
          await logout();
          await navigate({ to: "/login" });
        }}
        notifications={notifications.items}
        onNotificationRead={notifications.markRead}
        profileHref="/app/identity/profile"
        showHomeAction={false}
        showSidebarUser={false}
        showThemeAction={canSelectApplicationTheme(claims.role)}
        subtitle={null}
        title={null}
        user={{
          email: claims.email,
          fallback: initials(claims.name ?? claims.email),
          name: claims.name ?? claims.email
        }}
        versionLabel={`v ${__APP_VERSION__}`}
        workspaceItems={[
          neotWebBundle.applicationSwitcherItem(!showingIdentity),
          ...(administrator
            ? [
                {
                  active: showingIdentity,
                  description: "Local users, roles, and permissions.",
                  icon: ShieldCheckIcon,
                  title: "Platform",
                  url: "/app/identity/users"
                }
              ]
            : [])
        ]}
      >
        <Suspense fallback={<GlobalLoader />}>
          {showingSettings ? (
            <ApplicationSettingsWorkspace />
          ) : showingIdentity ? (
            <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-5 py-4 lg:w-[calc(100%-3rem)] lg:py-5">
              {renderIdentityPage(identityPage!, claims.email)}
            </main>
          ) : workspace ? (
            <workspace.component />
          ) : (
            <GlobalLoader />
          )}
        </Suspense>
      </ApplicationLayout>
    </AuthGate>
  );
}

function buildApplicationMenu(
  activeWorkspaceId: string,
  honeyVisible: boolean,
  toggleHoney: () => void
) {
  return [
    ...neotWebBundle.menuItems(activeWorkspaceId),
    {
      icon: Settings2Icon,
      items: [
        {
          icon: honeyVisible ? EyeOffIcon : EyeIcon,
          onSelect: toggleHoney,
          title: honeyVisible ? "Hide Honey" : "Show Honey"
        }
      ],
      title: "Settings"
    }
  ];
}

function buildGlobalSearchItems(administrator: boolean): GlobalSearchItem[] {
  const workspaces = neotWebBundle.workspaces.map((entry) => ({
    group: entry.group,
    keywords: [entry.id, "NEOT", "workspace"],
    title: entry.title,
    url: workspaceUrl(entry.id)
  }));
  if (!administrator) return workspaces;
  return [
    ...workspaces,
    ...[
      ["Users", "users"],
      ["Roles", "roles"],
      ["Permissions", "permissions"],
      ["Access controls", "access"]
    ].map(([title, page]) => ({
      group: "Platform",
      keywords: ["identity", "security"],
      title: title!,
      url: `/app/identity/${page}`
    }))
  ];
}

function workspaceUrl(workspaceId: string) {
  if (workspaceId.startsWith("design-system-")) {
    return `/app/neot/design-system/${workspaceId.replace("design-system-", "")}`;
  }
  return `/app/neot/${workspaceId}`;
}

function renderIdentityPage(page: IdentityPage, actorEmail: string) {
  if (page === "identity.users") return <UserWorkspace actorEmail={actorEmail} />;
  if (page === "identity.roles") return <RoleWorkspace />;
  if (page === "identity.permissions") return <PermissionWorkspace />;
  if (page === "identity.access") return <RolePermissionWorkspace />;
  return <UserProfileWorkspace />;
}

function buildIdentityMenu(
  page: IdentityPage,
  navigate: ReturnType<typeof useNavigate>,
  administrator: boolean
): SidemenuItem[] {
  if (!administrator) return [];
  const item = (title: string, target: IdentityPage) => ({
    isActive: page === target,
    onSelect: () => void navigate({ to: `/app/${target.replaceAll(".", "/")}` }),
    title
  });
  return [
    {
      icon: ShieldCheckIcon,
      isActive: true,
      items: [
        item("Users", "identity.users"),
        item("Roles", "identity.roles"),
        item("Permissions", "identity.permissions"),
        item("Access controls", "identity.access")
      ],
      title: "Platform"
    }
  ];
}

function identityPageFromPath(pathname: string): IdentityPage | null {
  const value = pathname.replace(/^\/app\/?/u, "").replaceAll("/", ".");
  const allowed: IdentityPage[] = [
    "identity.users",
    "identity.roles",
    "identity.permissions",
    "identity.access",
    "identity.profile"
  ];
  return allowed.includes(value as IdentityPage) ? (value as IdentityPage) : null;
}

function identityTitle(page: IdentityPage) {
  return page
    .split(".")
    .at(-1)!
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readClaims(): Claims {
  const token = getToken();
  if (!token) return { email: "" };
  try {
    return JSON.parse(
      atob((token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/"))
    ) as Claims;
  } catch {
    return { email: "" };
  }
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
