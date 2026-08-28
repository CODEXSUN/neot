import React from "react";
import { RouterProvider } from "@tanstack/react-router";
import { GlobalLoader } from "@neot/ui/components/global-loader";
import { Toaster } from "@neot/ui/components/sonner";
import { AppProviders } from "./providers";
import { router } from "./router";
import { applyDesignSystemPreference } from "./design-system";
import { PageTitle } from "../shared/document/PageTitle";

applyDesignSystemPreference();

export function PlatformWebApp() {
  return (
    <React.StrictMode>
      <AppProviders>
        <React.Suspense fallback={<GlobalLoader />}>
          <PageTitle />
          <RouterProvider router={router} />
        </React.Suspense>
        <Toaster />
      </AppProviders>
    </React.StrictMode>
  );
}
