export function requireEnvValue(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing required environment value: ${name}`);
  }
  return trimmed;
}

export function requireEnvNumber(value: string | undefined, name: string): number {
  const raw = requireEnvValue(value, name);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric environment value for ${name}: ${raw}`);
  }
  return parsed;
}
