import { defineModule } from "@neot/framework/modules";
import type { NEOTModuleDependencies } from "../../module-dependencies.js";
import { registerProjectManagerRoutes } from "./project-manager.routes.js";

export const projectManagerModule = defineModule<NEOTModuleDependencies>({
  key: "neot.project-manager",
  label: "Project Manager",
  register({ app }) {
    return registerProjectManagerRoutes(app);
  }
});
