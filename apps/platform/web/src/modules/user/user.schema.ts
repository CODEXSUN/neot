import { z } from "zod";
export const userSchema = z
  .object({
    confirmPassword: z.string().max(128).optional().or(z.literal("")),
    email: z.string().trim().email("A valid email is required."),
    name: z.string().trim().min(2, "User name is required.").max(180),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters.")
      .max(128)
      .optional()
      .or(z.literal("")),
    status: z.enum(["active", "inactive", "suspended"])
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "Password and confirm password must match.",
        path: ["confirmPassword"]
      });
    }
  });

export const userAdminSchema = z
  .object({
    confirmPassword: z.string().max(128).optional().or(z.literal("")),
    email: z.string().trim().email("A valid email is required."),
    name: z.string().trim().min(2, "User name is required.").max(180),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters.")
      .max(128)
      .optional()
      .or(z.literal("")),
    status: z.enum(["active", "inactive", "suspended"])
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "Password and confirm password must match.",
        path: ["confirmPassword"]
      });
    }
  });

export const userProfileSchema = z
  .object({
    confirmPassword: z.string().max(128),
    email: z.string().trim().email("A valid email is required."),
    name: z.string().trim().min(2, "User name is required.").max(180),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters.")
      .max(128)
      .optional()
      .or(z.literal(""))
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password and confirmation must match.",
    path: ["confirmPassword"]
  });
