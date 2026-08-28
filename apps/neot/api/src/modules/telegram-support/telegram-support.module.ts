import { defineModule } from "@neot/framework/modules";
import type { NEOTModuleDependencies } from "../../module-dependencies.js";
import { registerTelegramSupportRoutes } from "./telegram-support.routes.js";
export const telegramSupportModule = defineModule<NEOTModuleDependencies>({ key: "neot.telegram-support", label: "Telegram Support", register: ({ app }) => registerTelegramSupportRoutes(app) });
