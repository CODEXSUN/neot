import { defineModule } from "@neot/framework/modules";
import type { PlatformModuleDependencies } from "../../module-dependencies.js";
import { registerUserRoutes } from "./user.routes.js";
export const userModule = defineModule<PlatformModuleDependencies>({
  key: "identity.user",
  label: "Users",
  register: ({ app }) => registerUserRoutes(app)
});
