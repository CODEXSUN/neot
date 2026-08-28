import { defineModule } from "@neot/framework/modules";
import type { NEOTModuleDependencies } from "../../module-dependencies.js";
import { registerHoneyRoutes } from "./honey.routes.js";

export const honeyModule = defineModule<NEOTModuleDependencies>({
  key: "neot.honey", label: "Honey Assistant", register: ({ app }) => registerHoneyRoutes(app)
});
