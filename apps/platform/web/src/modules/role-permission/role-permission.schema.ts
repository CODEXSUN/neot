import { z } from "zod";
export const rolePermissionSchema = z.object({
  roleId: z.number().int().positive("Role is required."),
  permissionId: z.number().int().positive("Permission is required."),
  status: z.enum(["active", "inactive"])
});
