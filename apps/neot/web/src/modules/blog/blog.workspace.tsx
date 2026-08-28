import type { BlogsEditorHost } from "@codexsun/blog/web";
import { lazy, Suspense } from "react";

const loadFileManager = () =>
  import("@codexsun/file-manager/web").then((module) => {
    module.configureFileManagerClient({ baseUrl: "/api/platform/file-manager" });
    return module;
  });

const host: BlogsEditorHost = {
  listAuthors: async () => [],
  listImages: async () => {
    const fileManager = await loadFileManager();
    return (await fileManager.listFiles())
      .filter((file) => file.mimeType.startsWith("image/"))
      .map(({ mimeType, name, url, uuid }) => ({
        mimeType,
        name,
        url: fileManager.resolveFileManagerUrl(url),
        uuid
      }));
  },
  uploadImage: async (file) => {
    const fileManager = await loadFileManager();
    const uploaded = await fileManager.uploadFile(file);
    return {
      mimeType: uploaded.mimeType,
      name: uploaded.name,
      url: fileManager.resolveFileManagerUrl(uploaded.url),
      uuid: uploaded.uuid
    };
  }
};

const BlogsEditorWorkspace = lazy(async () => {
  const module = await import("@codexsun/blog/web");
  return { default: module.BlogsEditorWorkspace };
});

export function NEOTBlogWorkspace() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading blog...</div>}>
      <BlogsEditorWorkspace host={host} />
    </Suspense>
  );
}
