import { loadEnv } from "@neot/framework/env";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  AUTH_MODE: z.enum(["cookie", "jwt", "hybrid"]).default("jwt"),
  PLATFORM_API_PORT: z.coerce.number().int().positive(),
  PLATFORM_API_URL: z.string().url("PLATFORM_API_URL must be a valid URL"),
  PLATFORM_WEB_PORT: z.coerce.number().int().positive().default(9260),
  PLATFORM_WEB_ORIGIN: z.string().url("PLATFORM_WEB_ORIGIN must be a valid URL"),
  PLATFORM_WEB_ORIGINS: z.string().default(""),
  PLATFORM_WEB_HEALTH_URL: z.union([z.literal(""), z.string().url()]).default(""),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive(),
  DB_USER: z.string().min(1, "DB_USER is required"),
  DB_PASSWORD: z.string(),
  DB_DRIVER: z.enum(["mariadb", "mysql2"]).default("mariadb"),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
  NEOT_DB_FRESH_ON_START: z.enum(["0", "1"]).default("0"),
  NEOT_DB_RESET_CONFIRM: z.string().default(""),
  NEOT_ALLOW_PRODUCTION_DB_RESET: z.enum(["0", "1"]).default("0"),
  DEV_AUTO_LOGIN: z.enum(["0", "1"]).default("0"),
  INITIAL_ADMIN_EMAIL: z.string().default(""),
  INITIAL_ADMIN_NAME: z.string().default(""),
  INITIAL_ADMIN_PASSWORD: z.string().default(""),
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_BASE_URL: z
    .string()
    .url("OPENAI_BASE_URL must be a valid URL")
    .default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().min(1, "OPENAI_MODEL is required").default("gpt-5.6-terra"),
  OPENAI_REASONING_EFFORT: z.enum(["low", "medium", "high"]).default("medium"),
  CODEX_EXECUTABLE: z.string().min(1).default("bundled"),
  NEOT_CODEX_HOME: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().default(""),
  TELEGRAM_BOT_USERNAME: z.string().default(""),
  TELEGRAM_API_ID: z.coerce.number().int().positive().optional(),
  TELEGRAM_API_HASH: z.string().default(""),
  TELEGRAM_SESSION_ENCRYPTION_KEY: z.string().default(""),
  TELEGRAM_WEBHOOK_SECRET: z.string().default(""),
  TELEGRAM_WEBHOOK_PUBLIC_URL: z.union([z.literal(""), z.string().url()]).default(""),
  REDIS_URL: z.union([z.literal(""), z.string().url()]).default(""),
  MAIL_SMTP_HOST: z.string().default(""),
  MAIL_SMTP_PORT: z.coerce.number().int().positive().default(587),
  MAIL_SMTP_SECURE: z.enum(["0", "1"]).default("0"),
  MAIL_SMTP_USERNAME: z.string().default(""),
  MAIL_SMTP_PASSWORD: z.string().default(""),
  MAIL_FROM_EMAIL: z.string().default(""),
  MAIL_FROM_NAME: z.string().default("NEOT"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required")
});

export const env = loadEnv(envSchema);
