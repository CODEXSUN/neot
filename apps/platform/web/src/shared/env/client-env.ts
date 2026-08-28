export function requiredClientEnv(name: string): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required client environment value: ${name}`);
  }
  return value.trim();
}
