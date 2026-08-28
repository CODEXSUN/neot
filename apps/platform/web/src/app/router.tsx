import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { lazy } from "react";

const AppDesk = lazy(() =>
  import("../desks/app/AppDesk").then((module) => ({ default: module.AppDesk }))
);
const HealthPage = lazy(() =>
  import("../public/health/HealthPage").then((module) => ({ default: module.HealthPage }))
);
const LoginPage = lazy(() =>
  import("../public/login/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const PublicSite = lazy(() =>
  import("../public/site/PublicSite").then((module) => ({ default: module.PublicSite }))
);

const publicPage = (page: import("../public/site/PublicSite").PublicPage) => () => (
  <PublicSite page={page} />
);

const rootRoute = createRootRoute();
const routeTree = rootRoute.addChildren([
  createRoute({ component: publicPage("home"), getParentRoute: () => rootRoute, path: "/" }),
  createRoute({
    component: publicPage("learning"),
    getParentRoute: () => rootRoute,
    path: "/learning"
  }),
  createRoute({
    component: publicPage("students"),
    getParentRoute: () => rootRoute,
    path: "/students"
  }),
  createRoute({
    component: publicPage("masters"),
    getParentRoute: () => rootRoute,
    path: "/masters"
  }),
  createRoute({
    component: publicPage("organisations"),
    getParentRoute: () => rootRoute,
    path: "/organisations"
  }),
  createRoute({ component: publicPage("about"), getParentRoute: () => rootRoute, path: "/about" }),
  createRoute({
    component: publicPage("contact"),
    getParentRoute: () => rootRoute,
    path: "/contact"
  }),
  createRoute({
    component: publicPage("privacy"),
    getParentRoute: () => rootRoute,
    path: "/privacy"
  }),
  createRoute({ component: publicPage("terms"), getParentRoute: () => rootRoute, path: "/terms" }),
  createRoute({ component: HealthPage, getParentRoute: () => rootRoute, path: "/status" }),
  createRoute({ component: LoginPage, getParentRoute: () => rootRoute, path: "/login" }),
  createRoute({ component: AppDesk, getParentRoute: () => rootRoute, path: "/app/$" })
]);

export const router = createRouter({ routeTree });
