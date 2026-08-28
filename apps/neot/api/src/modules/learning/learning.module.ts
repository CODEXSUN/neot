import { defineModule } from "@neot/framework/modules";
import type { NEOTModuleDependencies } from "../../module-dependencies.js";
import { registerLearningRoutes } from "./learning.routes.js";

export const learningModule = defineModule<NEOTModuleDependencies>({
  key: "neot.learning",
  label: "Learning",
  register({ app }) {
    return registerLearningRoutes(app);
  }
});
