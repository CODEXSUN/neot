import { defineModule } from "@neot/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerRolePermissionRoutes } from "./role-permission.routes.js";
export const rolePermissionModule = defineModule<PlatformModuleDependencies>({
  key: "identity.role-permission",
  label: "Role Permissions",
  register: ({ app }) => registerRolePermissionRoutes(app)
});
