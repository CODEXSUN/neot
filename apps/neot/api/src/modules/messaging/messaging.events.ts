import type { MessagingEvent } from "./messaging.types.js";

const listeners = new Set<(event: MessagingEvent) => void>();

export function publishMessagingEvent(event: MessagingEvent) {
  for (const listener of listeners) listener(event);
}

export function subscribeMessagingEvents(listener: (event: MessagingEvent) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
