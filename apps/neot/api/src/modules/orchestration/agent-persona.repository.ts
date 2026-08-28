import { randomBytes } from "node:crypto";
import { AppError } from "@neot/framework/errors";
import { getNEOTDatabase } from "../../database/neot-database.js";
import type { AgentPersonaInput } from "./orchestration.schemas.js";

export class AgentPersonaRepository {
  private readonly database = getNEOTDatabase();

  async list(actorId: string) {
    const rows = await this.database.selectFrom("neot_agent_personas").selectAll()
      .where("actor_id", "=", actorId).where("status", "=", "active")
      .orderBy("role").orderBy("name").execute();
    return rows.map(mapPersona);
  }

  async create(input: AgentPersonaInput, actorId: string) {
    const uuid = id();
    await this.database.insertInto("neot_agent_personas").values({
      actor_id: actorId,
      agent_profile: input.agentProfile,
      description: input.description,
      instructions: input.instructions,
      name: input.name,
      persona_key: input.key,
      role: input.role,
      status: "active",
      uuid
    }).executeTakeFirstOrThrow();
    return this.require(uuid, actorId);
  }

  async update(uuid: string, input: AgentPersonaInput, actorId: string) {
    await this.require(uuid, actorId);
    await this.database.updateTable("neot_agent_personas").set({
      agent_profile: input.agentProfile,
      description: input.description,
      instructions: input.instructions,
      name: input.name,
      persona_key: input.key,
      role: input.role
    }).where("uuid", "=", uuid).where("actor_id", "=", actorId).executeTakeFirst();
    return this.require(uuid, actorId);
  }

  async createStarterTeam(actorId: string) {
    const existing = await this.list(actorId);
    if (existing.length) return existing;
    for (const persona of starterTeam) await this.create(persona, actorId);
    return this.list(actorId);
  }

  async require(uuid: string, actorId: string) {
    const row = await this.database.selectFrom("neot_agent_personas").selectAll()
      .where("uuid", "=", uuid).where("actor_id", "=", actorId)
      .where("status", "=", "active").executeTakeFirst();
    if (!row) throw AppError.notFound("Agent persona was not found.");
    return mapPersona(row);
  }
}

const starterTeam: AgentPersonaInput[] = [
  { agentProfile: "review", description: "Coordinates the task graph and performs the final independent review.", instructions: "Review delegate evidence, inspect relevant diffs, run safe checks, and report findings before human approval.", key: "atlas", name: "Atlas", role: "supervisor" },
  { agentProfile: "planning", description: "Inspects requirements and repository evidence.", instructions: "Clarify scope, dependencies, risks, and acceptance evidence without changing files unless explicitly assigned.", key: "scout", name: "Scout", role: "delegate" },
  { agentProfile: "coding", description: "Implements module-owned backend and general code changes.", instructions: "Make the smallest complete change in the assigned scope and run focused verification.", key: "forge", name: "Forge", role: "delegate" },
  { agentProfile: "coding", description: "Implements accessible product interface changes.", instructions: "Follow the existing design system, keep interactions functional, and verify responsive behavior.", key: "canvas", name: "Canvas", role: "delegate" },
  { agentProfile: "testing", description: "Tests changes and reports reproducible evidence.", instructions: "Run registered checks, diagnose failures, and never hide or rewrite failing evidence.", key: "sentinel", name: "Sentinel", role: "delegate" }
];

function mapPersona(row: {
  agent_profile: string; created_at: Date | string; description: string; instructions: string;
  name: string; persona_key: string; role: string; updated_at: Date | string; uuid: string;
}) {
  return {
    agentProfile: row.agent_profile,
    createdAt: new Date(row.created_at).toISOString(),
    description: row.description,
    instructions: row.instructions,
    key: row.persona_key,
    name: row.name,
    role: row.role as "delegate" | "supervisor",
    updatedAt: new Date(row.updated_at).toISOString(),
    uuid: row.uuid
  };
}

function id() { return randomBytes(8).toString("hex"); }

export const agentPersonaRepository = new AgentPersonaRepository();
