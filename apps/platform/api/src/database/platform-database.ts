import { existsSync, writeFileSync } from "node:fs";
import { createConnection } from "mysql2/promise";
import { createPool, type PoolOptions } from "mysql2";
import { Kysely, MysqlDialect, sql } from "kysely";
import { bootstrapNEOTDatabase } from "@neot/neot-api";
import type { NEOTDatabase } from "@neot/neot-api";
import { env } from "../env.js";
import { migratePermissionModule } from "../modules/permission/permission.migration.js";
import { seedPermissionModule } from "../modules/permission/permission.seed.js";
import { migrateRoleModule } from "../modules/role/role.migration.js";
import { seedRoleModule } from "../modules/role/role.seed.js";
import { migrateUserModule } from "../modules/user/user.migration.js";
import { seedUserModule } from "../modules/user/user.seed.js";
import { migrateUserRoleModule } from "../modules/user-role/user-role.migration.js";
import { seedUserRoleModule } from "../modules/user-role/user-role.seed.js";
import { migrateRolePermissionModule } from "../modules/role-permission/role-permission.migration.js";
import { seedRolePermissionModule } from "../modules/role-permission/role-permission.seed.js";
import { assertDatabaseName, quoteIdentifier } from "./database-utils.js";
import type { PlatformDatabase } from "./schema.js";

let database: Kysely<PlatformDatabase> | null = null;
let bootstrapped = false;

export const neotMigrationOrder = Object.freeze([
  "identity.role",
  "identity.permission",
  "identity.user",
  "identity.user-role",
  "identity.role-permission",
  "neot.project-manager.sql.v4",
  "neot.task-manager.sql.v2",
  "neot.planning.sql.v2",
  "neot.sync.sql.v1"
]);

export const neotSeedOrder = Object.freeze([
  "identity.role",
  "identity.permission",
  "identity.user",
  "identity.user-role",
  "identity.role-permission"
]);

export function platformDatabaseName() {
  return assertDatabaseName(env.DB_NAME, "NEOT database name");
}

export function platformDatabaseConfig() {
  return {
    database: platformDatabaseName(),
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER
  };
}

export function getPlatformDatabase() {
  if (!database) {
    database = new Kysely<PlatformDatabase>({
      dialect: new MysqlDialect({
        pool: createPool({
          ...platformDatabaseConfig(),
          connectionLimit: 10,
          timezone: "Z"
        } satisfies PoolOptions)
      })
    });
  }
  return database;
}

export async function bootstrapPlatformDatabase() {
  if (bootstrapped || process.env.NEOT_DEV_SKIP_DB === "1") return;
  if (env.NEOT_DB_FRESH_ON_START === "1") {
    const sessionFile = process.env.NEOT_DB_FRESH_SESSION_FILE;
    if (!sessionFile || !existsSync(sessionFile)) {
      await resetPlatformDatabase();
      if (sessionFile) writeFileSync(sessionFile, new Date().toISOString(), "utf8");
      return;
    }
  }
  await createPlatformDatabase();
  await migratePlatformDatabase();
  await seedPlatformDatabase();
  bootstrapped = true;
  console.info(`[database] NEOT database ready: "${platformDatabaseName()}"`);
}

export async function createPlatformDatabase() {
  const connection = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    timezone: "Z"
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(platformDatabaseName())} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

export async function migratePlatformDatabase() {
  const db = getPlatformDatabase();
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(160) NOT NULL UNIQUE,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(db);
  await migrateRoleModule(db);
  await migratePermissionModule(db);
  await migrateUserModule(db);
  await migrateUserRoleModule(db);
  await migrateRolePermissionModule(db);
  await bootstrapNEOTDatabase(db as unknown as Kysely<NEOTDatabase>);
}

export async function seedPlatformDatabase() {
  const db = getPlatformDatabase();
  await seedRoleModule(db);
  await seedPermissionModule(db);
  await seedUserModule(db);
  await seedUserRoleModule(db);
  await seedRolePermissionModule(db);
}

export async function closePlatformDatabase() {
  if (database) await database.destroy();
  database = null;
  bootstrapped = false;
}

export async function resetPlatformDatabase() {
  assertDestructiveDatabaseAction();
  await closePlatformDatabase();
  const connection = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    timezone: "Z"
  });
  try {
    await connection.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(platformDatabaseName())}`);
  } finally {
    await connection.end();
  }
  await createPlatformDatabase();
  await migratePlatformDatabase();
  await seedPlatformDatabase();
  bootstrapped = true;
}

function assertDestructiveDatabaseAction() {
  if (env.NEOT_DB_RESET_CONFIRM !== "DROP_DATABASE") {
    throw new Error("Set NEOT_DB_RESET_CONFIRM=DROP_DATABASE to reset the NEOT database.");
  }
  if (env.NODE_ENV === "production" && env.NEOT_ALLOW_PRODUCTION_DB_RESET !== "1") {
    throw new Error("Production database reset is disabled.");
  }
}
