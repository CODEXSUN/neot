export async function recordAuditEvent(input: {
  action: string;
  actorEmail: string;
  moduleKey: string;
  recordId?: number | string | null;
  recordLabel?: string;
  recordUuid?: string | null;
}) {
  console.info("[audit]", input);
}
