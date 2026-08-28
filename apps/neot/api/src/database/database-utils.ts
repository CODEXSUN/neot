import { sql, type Kysely } from "kysely";

export function assertDatabaseName(value: string) {
  if (!/^[a-zA-Z0-9_]+$/u.test(value)) {
    throw new Error(`Invalid NEOT database name: ${value}`);
  }
  return value;
}

export function quoteIdentifier(value: string) {
  return `\`${assertDatabaseName(value)}\``;
}

export async function renameLegacyTable<Database>(
  database: Kysely<Database>,
  legacyName: string,
  ownedName: string,
) {
  const legacyExists = await tableExists(database, legacyName);
  if (!legacyExists) return;
  if (await tableExists(database, ownedName)) {
    throw new Error(
      `Cannot rename legacy NEOT table ${legacyName}: ${ownedName} already exists.`,
    );
  }
  await sql
    .raw(
      `RENAME TABLE ${quoteIdentifier(legacyName)} TO ${quoteIdentifier(ownedName)}`,
    )
    .execute(database);
}

async function tableExists<Database>(
  database: Kysely<Database>,
  tableName: string,
) {
  const result = await sql<{ count: number | string }>`
    SELECT COUNT(*) AS count
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ${tableName}
  `.execute(database);
  return Number(result.rows[0]?.count ?? 0) > 0;
}
