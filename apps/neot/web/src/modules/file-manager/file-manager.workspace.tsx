import { lazy, Suspense } from "react";

const FileBrowserWorkspace = lazy(async () => {
  const module = await import("@codexsun/file-manager/web");
  module.configureFileManagerClient({ baseUrl: "/api/platform/file-manager" });
  return { default: module.FileBrowserWorkspace };
});

export function NEOTFileManagerWorkspace() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading files...</div>}>
      <FileBrowserWorkspace />
    </Suspense>
  );
}
