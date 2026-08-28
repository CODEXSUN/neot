import { defineModule } from "@neot/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerPermissionRoutes } from "./permission.routes.js";
export const permissionModule = defineModule<PlatformModuleDependencies>({
  key: "identity.permission",
  label: "Permissions",
  register: ({ app }) => registerPermissionRoutes(app)
});
