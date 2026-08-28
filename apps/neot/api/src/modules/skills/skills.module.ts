import { defineModule } from "@neot/framework/modules";
import type { NEOTModuleDependencies } from "../../module-dependencies.js";
import { registerSkillsRoutes } from "./skills.routes.js";

export const skillsModule = defineModule<NEOTModuleDependencies>({
  key: "neot.skills",
  label: "Skill Library",
  register: ({ app }) => registerSkillsRoutes(app)
});
