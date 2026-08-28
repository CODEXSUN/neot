export const projectManagerEvents = {
  changed: "neot.project-manager.changed",
  registryChanged: "neot.project-manager.registry-changed"
} as const;

export function createProjectManagerEvent(
  action: "created" | "updated" | "status-changed",
  payload: { id: string; kind: string }
) {
  return {
    name: projectManagerEvents.changed,
    occurredAt: new Date().toISOString(),
    payload: { action, ...payload },
    version: 1
  };
}
