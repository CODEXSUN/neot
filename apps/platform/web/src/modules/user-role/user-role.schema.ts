import { z } from "zod";
export const userRoleSchema = z.object({
  userId: z.number().int().positive("User is required."),
  roleId: z.number().int().positive("Role is required."),
  status: z.enum(["active", "inactive"])
});
