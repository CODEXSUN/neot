export type HoneyConversationState = "inactive" | "idle" | "listening" | "thinking" | "success" | "warning" | "error";

export const honeyConversationEvent = "neot:honey-conversation-state";
let currentHoneyConversationState: HoneyConversationState = "inactive";

export function notifyHoneyConversation(state: HoneyConversationState) {
  currentHoneyConversationState = state;
  window.dispatchEvent(new CustomEvent<HoneyConversationState>(honeyConversationEvent, { detail: state }));
}

export function getHoneyConversationState() {
  return currentHoneyConversationState;
}
