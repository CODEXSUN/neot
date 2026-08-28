export async function processTaskManagerEvent(event: { type: string; todoId?: string }) {
  return { ...event, processed: true };
}
