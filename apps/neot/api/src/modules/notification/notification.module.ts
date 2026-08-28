import { defineModule } from "@neot/framework/modules";
import type { NEOTModuleDependencies } from "../../module-dependencies.js";
import { registerNotificationRoutes } from "./notification.routes.js";

export const notificationModule = defineModule<NEOTModuleDependencies>({
  key: "neot.notification",
  label: "Notifications",
  register: ({ app }) => registerNotificationRoutes(app)
});
