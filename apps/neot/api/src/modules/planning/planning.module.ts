import { defineModule } from "@neot/framework/modules";
import type { NEOTModuleDependencies } from "../../module-dependencies.js";
import { registerPlanningRoutes } from "./planning.routes.js";

export const planningModule = defineModule<NEOTModuleDependencies>({
  key: "neot.planning",
  label: "Planning",
  register: ({ app }) => registerPlanningRoutes(app),
});
