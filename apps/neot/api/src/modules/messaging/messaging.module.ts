import { defineModule } from "@neot/framework/modules";
import type { NEOTModuleDependencies } from "../../module-dependencies.js";
import { registerMessagingRoutes } from "./messaging.routes.js";

export const messagingModule = defineModule<NEOTModuleDependencies>({
  key: "neot.messaging",
  label: "Messenger",
  register({ app }) { return registerMessagingRoutes(app); }
});
