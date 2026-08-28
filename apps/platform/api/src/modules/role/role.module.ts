import { defineModule } from "@neot/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerRoleRoutes } from "./role.routes.js";
export const roleModule = defineModule<PlatformModuleDependencies>({
  key: "identity.role",
  label: "Roles",
  register: ({ app }) => registerRoleRoutes(app)
});
