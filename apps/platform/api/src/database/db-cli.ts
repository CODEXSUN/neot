import { createConnection } from "mysql2/promise";
import { env } from "../env.js";
import {
  closePlatformDatabase,
  createPlatformDatabase,
  migratePlatformDatabase,
  resetPlatformDatabase,
  seedPlatformDatabase,
  platformDatabaseName
} from "./platform-database.js";

type DbCommand = "migrate" | "seed" | "drop" | "fresh" | "migrations:list";
const validCommands: DbCommand[] = ["migrate", "seed", "drop", "fresh", "migrations:list"];
const command = process.argv[2] as DbCommand | undefined;

async function main() {
  if (!command || !validCommands.includes(command)) {
    console.info("Usage: npm run db:migrate|db:seed|db:drop|dbmigrate:fresh|db:migrations:list");
    process.exitCode = 1;
    return;
  }

  try {
    if (command === "migrate") {
      await createPlatformDatabase();
      await migratePlatformDatabase();
    } else if (command === "seed") {
      await createPlatformDatabase();
      await migratePlatformDatabase();
      await seedPlatformDatabase();
    } else if (command === "drop" || command === "fresh") {
      await resetPlatformDatabase();
    } else {
      await listMigrations();
    }
    console.info(`[database] db:${command} completed for "${platformDatabaseName()}"`);
  } finally {
    await closePlatformDatabase();
  }
}

async function listMigrations() {
  const connection = await createConnection({
    database: platformDatabaseName(),
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    timezone: "Z"
  });
  try {
    const [rows] = await connection.query(
      "SELECT name, applied_at FROM schema_migrations ORDER BY applied_at, id"
    );
    console.table(rows);
  } finally {
    await connection.end();
  }
}

await main();
