import { z } from "zod";
export const roleSchema = z.object({
  description: z.string().trim().max(500),
  key: z
    .string()
    .trim()
    .min(2, "Role key is required.")
    .max(120)
    .regex(/^[a-z0-9._-]+$/, "Use lowercase letters, numbers, dots, underscores, or hyphens."),
  label: z.string().trim().min(2, "Role name is required.").max(160),
  status: z.enum(["active", "inactive"])
});
