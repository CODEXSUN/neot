import { defineModule } from "@neot/framework/modules";
import type { NEOTModuleDependencies } from "../../module-dependencies.js";
import { registerOrchestrationRoutes } from "./orchestration.routes.js";

export const orchestrationModule = defineModule<NEOTModuleDependencies>({
  key: "neot.orchestration",
  label: "Engineering Orchestration",
  register({ app }) {
    return registerOrchestrationRoutes(app);
  }
});
