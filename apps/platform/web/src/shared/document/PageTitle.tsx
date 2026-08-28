import { useEffect } from "react";

const applicationName = "NEOT";

export function setPlatformDocumentTitle(pageTitle: string) {
  document.title = `${applicationName} | ${pageTitle}`;
}

const pageTitles: Record<string, string> = {
  "/": "Learn today. Own tomorrow.",
  "/about": "About",
  "/admin": "Admin Desk",
  "/admin/login": "Staff Admin Login",
  "/app": "Application Desk",
  "/contact": "Contact",
  "/learning": "Learning",
  "/login": "App Login",
  "/masters": "For Masters",
  "/organisations": "For Organisations",
  "/privacy": "Privacy Policy",
  "/sa": "Super Admin Desk",
  "/sa/login": "Super Admin Login",
  "/status": "Status",
  "/students": "For Students",
  "/terms": "Terms of Use",
  "/workspace": "Dashboard"
};

function resolvePageTitle(pathname: string) {
  if (pathname.startsWith("/sa/") && pathname !== "/sa/login") {
    return "Super Admin Desk";
  }
  if (pathname.startsWith("/app/")) {
    return "Application Desk";
  }
  return pageTitles[pathname] ?? "Dashboard";
}

export function PageTitle() {
  useEffect(() => {
    const updateTitle = () => {
      if (window.location.pathname.startsWith("/app/")) return;
      setPlatformDocumentTitle(resolvePageTitle(window.location.pathname));
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushState(...args) {
      originalPushState.apply(this, args);
      updateTitle();
    };

    window.history.replaceState = function replaceState(...args) {
      originalReplaceState.apply(this, args);
      updateTitle();
    };

    window.addEventListener("popstate", updateTitle);
    updateTitle();

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", updateTitle);
    };
  }, []);

  return null;
}
