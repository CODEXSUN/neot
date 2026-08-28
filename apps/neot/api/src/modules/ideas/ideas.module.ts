import { defineModule } from "@neot/framework/modules";
import type { NEOTModuleDependencies } from "../../module-dependencies.js";
import { registerIdeasRoutes } from "./ideas.routes.js";

export const ideasModule = defineModule<NEOTModuleDependencies>({ key: "neot.ideas", label: "Ideas", register: ({ app }) => registerIdeasRoutes(app) });
