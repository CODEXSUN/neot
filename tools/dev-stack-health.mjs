export function matchesServiceHealthContract(payload, serviceName) {
  return Boolean(payload?.success && payload?.data?.checks?.[serviceName]);
}
