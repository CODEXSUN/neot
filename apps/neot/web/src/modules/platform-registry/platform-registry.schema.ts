import { z } from "zod";

export const platformRegistrySchema = z.object({
  active: z.boolean().optional(),
  description: z.string().optional(),
  key: z.string().trim().min(1, "Key is required."),
  name: z.string().trim().min(1, "Name is required."),
  parentId: z.string().optional(),
  status: z.string().trim().min(1).optional()
});
