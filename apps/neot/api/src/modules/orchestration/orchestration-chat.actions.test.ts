import { describe, expect, it } from "vitest";
import { chatActionFrom, upsertChatAction } from "./orchestration-chat.actions.js";

describe("Project Agent chat actions", () => {
  it("keeps the full command and updates its status by item id", () => {
    const started = chatActionFrom(
      {
        method: "item/started",
        params: {
          threadId: "thread-1",
          turnId: "turn-1",
          item: {
            command: "git status --short",
            id: "command-1",
            status: "inProgress",
            type: "commandExecution"
          }
        }
      },
      "thread-1"
    );
    const completed = chatActionFrom(
      {
        method: "item/completed",
        params: {
          threadId: "thread-1",
          turnId: "turn-1",
          item: {
            command: "git status --short",
            id: "command-1",
            status: "completed",
            type: "commandExecution"
          }
        }
      },
      "thread-1"
    );

    expect(started).toMatchObject({ label: "git status --short", status: "running" });
    expect(upsertChatAction([started!], completed!)).toEqual([completed]);
  });

  it("surfaces native automatic context compaction", () => {
    expect(
      chatActionFrom(
        {
          method: "item/completed",
          params: {
            threadId: "thread-1",
            turnId: "turn-1",
            item: { id: "compact-1", type: "contextCompaction" }
          }
        },
        "thread-1"
      )
    ).toEqual({
      id: "compact-1",
      label: "Context automatically compacted",
      status: "completed",
      type: "compaction"
    });
  });

  it("ignores actions from another connector thread", () => {
    expect(
      chatActionFrom(
        {
          method: "item/started",
          params: {
            threadId: "thread-2",
            item: { command: "pwd", id: "command-2", type: "commandExecution" }
          }
        },
        "thread-1"
      )
    ).toBeNull();
  });
});
