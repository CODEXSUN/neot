export type ConversationMessage = {
  createdAt: string;
  id: string;
  role: "agent" | "user";
  text: string;
};

export function groupAgentMessages(messages: ConversationMessage[]) {
  return messages.reduce<ConversationMessage[]>((grouped, message) => {
    const previous = grouped.at(-1);
    if (message.role !== "agent" || previous?.role !== "agent") return [...grouped, message];
    return [...grouped.slice(0, -1), { ...previous, text: mergeAgentText(previous.text, message.text) }];
  }, []);
}

export function mergeAgentText(previous: string, next: string) {
  if (!previous.trim()) return next;
  if (!next.trim() || previous.includes(next)) return previous;
  if (next.includes(previous)) return next;
  return `${previous.trimEnd()}\n\n${next.trimStart()}`;
}
