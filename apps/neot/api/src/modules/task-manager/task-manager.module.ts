import { defineModule } from "@neot/framework/modules";
import type { NEOTModuleDependencies } from "../../module-dependencies.js";
import { registerTaskManagerRoutes } from "./task-manager.routes.js";
export const taskManagerModule = defineModule<NEOTModuleDependencies>({
  key: "neot.task-manager",
  label: "Todo's",
  register({ app }) {
    return registerTaskManagerRoutes(app);
  }
});
