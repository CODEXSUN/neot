export function assertDatabaseName(value: string, label = "database name") {
  const normalized = value.trim();
  if (!/^[a-zA-Z0-9_]+$/.test(normalized)) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return normalized;
}

export function quoteIdentifier(value: string) {
  return `\`${assertDatabaseName(value, "identifier")}\``;
}
