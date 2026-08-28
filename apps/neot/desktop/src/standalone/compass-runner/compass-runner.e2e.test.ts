import { describe, expect, it } from "vitest";
import type { CompassExecutorAdapter, CompassTask } from "./contracts";
import { CompassRunner } from "./runner";

const at = () => new Date("2026-08-23T10:00:00.000Z");

describe("Compass Runner standalone E2E", () => {
  it("does not execute when the operator declines approval", async () => {
    let calls = 0;
    const runner = new CompassRunner(makeTask("renewal", "Send renewal quote.", "codex"), { id: "codex", async execute() { calls += 1; return approval("Quote sends an external email."); } }, at);
    await runner.start();
    expect((await runner.decideApproval("decline")).status).toBe("cancelled");
    expect(calls).toBe(1);
  });

  it("keeps every NEOT release mutation behind an interactive approval", async () => {
    let phase = 0;
    const runner = new CompassRunner(makeTask("release", "Prepare the next NEOT IDE release.", "opencode"), scripted("opencode", (_context) => {
      if (phase === 0) { phase = 1; return choice("Bump 1.0.77 to the next version?", ["Bump", "Cancel"]); }
      if (phase === 1) { phase = 2; return approval("Update package manifests and changelog evidence."); }
      if (phase === 2) { phase = 3; return choice("Remote changes were analysed. Continue to protected Git actions?", ["Continue", "Stop"]); }
      if (phase === 3) { phase = 4; return approval("Commit, push, tag, and publish the release."); }
      return result("Release evidence prepared; live mutation remains gated.", "release-evidence.md");
    }), at);

    expect((await runner.start()).interaction?.choices).toContain("Bump");
    expect((await runner.respond("Bump")).approval?.summary).toContain("package manifests");
    expect((await runner.decideApproval("approve")).interaction?.question).toContain("Remote changes");
    expect((await runner.respond("Continue")).approval?.summary).toContain("Commit, push, tag");
    const complete = await runner.decideApproval("approve");
    expect(complete).toMatchObject({ status: "completed", result: "Release evidence prepared; live mutation remains gated." });
    expect(complete.artifacts[0]?.name).toBe("release-evidence.md");
  });
});

function makeTask(id: string, objective: string, adapter: CompassTask["adapter"], inputs: CompassTask["inputs"] = [{ kind: "text", name: "request", value: objective }]): CompassTask {
  return { id, title: id, objective, inputs, adapter };
}

function scripted(id: CompassTask["adapter"], execute: (context: Parameters<CompassExecutorAdapter["execute"]>[0]) => Awaited<ReturnType<CompassExecutorAdapter["execute"]>>): CompassExecutorAdapter {
  return { id, async execute(context) { return execute(context); } };
}
function approval(summary: string) { return { kind: "approval" as const, approval: { id: "approve-send", summary, risk: "medium" as const, actions: ["approve", "decline"] as const }, log: "Prepared a protected external action." }; }
function choice(question: string, choices: readonly string[]) { return { kind: "interaction" as const, interaction: { id: "qualification", question, choices, acceptsText: false }, log: "Awaiting sales operator decision." }; }
function result(summary: string, name: string) { return { kind: "result" as const, summary, artifacts: [{ name, mediaType: "application/json", uri: `artifact://${name}` }], log: "Executor returned a structured report." }; }
