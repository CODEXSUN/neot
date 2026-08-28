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
const LandingLoginPage = lazy(() =>
  import("../public/login/LoginPage").then((module) => ({ default: module.LandingLoginPage }))
);

const rootRoute = createRootRoute();
const routeTree = rootRoute.addChildren([
  createRoute({ component: LandingLoginPage, getParentRoute: () => rootRoute, path: "/" }),
  createRoute({ component: HealthPage, getParentRoute: () => rootRoute, path: "/status" }),
  createRoute({ component: LoginPage, getParentRoute: () => rootRoute, path: "/login" }),
  createRoute({ component: AppDesk, getParentRoute: () => rootRoute, path: "/app/$" })
]);

export const router = createRouter({ routeTree });
