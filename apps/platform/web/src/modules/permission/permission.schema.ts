import { z } from "zod";
export const permissionSchema = z.object({
  description: z.string().trim().max(500),
  key: z
    .string()
    .trim()
    .min(3, "Permission key is required.")
    .max(160)
    .regex(/^[a-z0-9._-]+$/, "Use lowercase letters, numbers, dots, underscores, or hyphens."),
  label: z.string().trim().min(2, "Permission name is required.").max(160),
  status: z.enum(["active", "inactive"])
});
