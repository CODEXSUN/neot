import { ok } from "@neot/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { skillsRepository as repository } from "./skills.repository.js";

const nameSchema = z.object({ name: z.string().min(1).max(64) }).strict();

export async function registerSkillsRoutes(app: FastifyInstance) {
  app.get("/skills", async (request) => ok(await repository.list(), { requestId: request.id }));
  app.post("/skills", async (request) => {
    const input = z.object({ description: z.string().min(10).max(500), name: z.string().min(1).max(64) }).strict().parse(request.body);
    return ok(await repository.create(input), { requestId: request.id });
  });
  app.post("/skills/:name/files", async (request) => {
    const { name } = nameSchema.parse(request.params);
    const input = z.object({ content: z.string().max(1_000_000), file: z.string().min(1).max(500) }).strict().parse(request.body);
    return ok(await repository.createReference(name, input.file, input.content), { requestId: request.id });
  });
  app.get("/skills/:name/files/*", async (request) => {
    const { name } = nameSchema.parse(request.params);
    const file = wildcard(request.params);
    return ok({ content: await repository.read(name, file), file }, { requestId: request.id });
  });
  app.put("/skills/:name/files/*", async (request) => {
    const { name } = nameSchema.parse(request.params);
    const { content } = z.object({ content: z.string().max(1_000_000) }).strict().parse(request.body);
    return ok(await repository.save(name, wildcard(request.params), content), { requestId: request.id });
  });
  app.put("/skills/:name/usage", async (request) => {
    const { name } = nameSchema.parse(request.params);
    const usage = z.object({ prompting: z.boolean(), review: z.boolean() }).strict().parse(request.body);
    return ok(await repository.setUsage(name, usage), { requestId: request.id });
  });
  app.get("/skills/:name/download", async (request, reply) => {
    const { name } = nameSchema.parse(request.params);
    reply.header("content-disposition", `attachment; filename="${name}.skill.json"`);
    return reply.send(await repository.export(name));
  });
}

function wildcard(params: unknown) {
  return z.object({ "*": z.string().min(1).max(500) }).passthrough().parse(params)["*"];
}
