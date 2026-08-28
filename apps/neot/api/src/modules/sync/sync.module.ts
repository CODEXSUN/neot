import { defineModule } from "@neot/framework/modules";
import type { NEOTModuleDependencies } from "../../module-dependencies.js";
import { registerSyncRoutes } from "./sync.routes.js";

export const syncModule = defineModule<NEOTModuleDependencies>({
  key: "neot.sync",
  label: "NEOT Cloud Sync",
  register: ({ app }) => registerSyncRoutes(app)
});
