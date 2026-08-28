import type { FastifyInstance, FastifyRequest } from "fastify";
import { AppError } from "@neot/framework/errors";
import { ok } from "@neot/framework/http";
import { z } from "zod";
import { requireNEOTActor } from "../../request-context.js";
import { ProjectManagerService } from "./project-manager.service.js";
import { projectManagerAttachmentLimitBytes } from "./project-manager.storage.js";

const service = new ProjectManagerService();
const kindSchema = z.enum([
  "activity",
  "discussion",
  "issue",
  "kanban",
  "project",
  "release",
  "review",
  "task",
  "timeline",
  "todo"
]);
const attachmentKindSchema = z.enum(["activity", "issue", "project", "review", "task"]);
const idParamsSchema = z.object({ id: z.string().min(1) }).strict();
const kindParamsSchema = z.object({ kind: kindSchema }).strict();
const itemParamsSchema = z.object({ id: z.string().min(1), kind: kindSchema }).strict();
const attachmentRecordParamsSchema = z
  .object({ id: z.string().min(1), kind: attachmentKindSchema })
  .strict();
const attachmentParamsSchema = attachmentRecordParamsSchema
  .extend({ attachmentId: z.string().length(8) })
  .strict();
const attachmentHeadersSchema = z
  .object({
    "x-file-name": z.string().min(1).max(720),
    "x-file-type": z.string().min(1).max(120)
  })
  .loose();
const itemSaveSchema = z
  .object({
    active: z.boolean().optional(),
    assignee: z.string().optional(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    key: z.string().min(1),
    lane: z.string().optional(),
    logoText: z.string().trim().max(4).optional(),
    colorKey: z.enum(["slate", "violet", "amber", "blue", "emerald", "rose", "indigo"]).optional(),
    repositoryName: z.string().trim().max(160).optional(),
    repositoryUrl: z.string().trim().max(500).optional(),
    moduleKey: z.string().optional(),
    priority: z.enum(["critical", "high", "low", "medium"]).optional(),
    referenceId: z.string().optional(),
    referenceType: z.string().optional(),
    sortOrder: z.number().optional(),
    startDate: z.string().optional(),
    status: z.string().optional(),
    title: z.string().min(1),
    type: z.string().optional()
  })
  .strict();
const documentationRowSchema = z
  .object({
    createdAt: z.string(),
    id: z.string(),
    key: z.string(),
    updatedAt: z.string(),
    value: z.string()
  })
  .strict();
const planningNoteSchema = z
  .object({
    body: z.string(),
    createdAt: z.string(),
    id: z.string(),
    title: z.string(),
    updatedAt: z.string()
  })
  .strict();
const registrySaveSchema = z
  .object({
    active: z.boolean().optional(),
    description: z.string().optional(),
    documentation: z.record(z.string(), z.array(documentationRowSchema)).optional(),
    groupId: z.string().optional(),
    key: z.string().min(1),
    moduleType: z.enum(["area", "module", "page"]).optional(),
    name: z.string().min(1),
    parentGroupId: z.string().optional(),
    parentModuleId: z.string().optional(),
    planningNotes: z.array(planningNoteSchema).optional(),
    platformId: z.string().optional(),
    routePath: z.string().optional(),
    sortOrder: z.number().optional(),
    status: z.string().optional()
  })
  .strict();
export async function registerProjectManagerRoutes(app: FastifyInstance) {
  app.addContentTypeParser(
    "application/octet-stream",
    {
      bodyLimit: projectManagerAttachmentLimitBytes + 64 * 1024,
      parseAs: "buffer"
    },
    (_request, body, done) => done(null, body)
  );

  app.get("/admin/project-manager/result", async (request) =>
    ok(await service.result(), { requestId: request.id })
  );
  app.get("/admin/project-manager/registry/result", async (request) =>
    ok(await service.registryResult(), { requestId: request.id })
  );

  app.get("/admin/project-manager/registry/platforms", async (request) =>
    ok(await service.listRegistryPlatforms(), { requestId: request.id })
  );
  app.post("/admin/project-manager/registry/platforms", async (request) =>
    ok(
      await service.createRegistryPlatform(registrySaveSchema.parse(request.body), actor(request)),
      {
        requestId: request.id
      }
    )
  );
  app.put("/admin/project-manager/registry/platforms/:id", async (request) =>
    ok(
      await service.updateRegistryPlatform(
        idParamsSchema.parse(request.params).id,
        registrySaveSchema.partial().parse(request.body),
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/project-manager/registry/platforms/:id/deactivate", async (request) =>
    ok(
      await service.setRegistryActive(
        "platforms",
        idParamsSchema.parse(request.params).id,
        false,
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/project-manager/registry/platforms/:id/restore", async (request) =>
    ok(
      await service.setRegistryActive(
        "platforms",
        idParamsSchema.parse(request.params).id,
        true,
        actor(request)
      ),
      { requestId: request.id }
    )
  );

  app.get("/admin/project-manager/registry/groups", async (request) =>
    ok(await service.listRegistryGroups(), { requestId: request.id })
  );
  app.post("/admin/project-manager/registry/groups", async (request) =>
    ok(await service.createRegistryGroup(registrySaveSchema.parse(request.body), actor(request)), {
      requestId: request.id
    })
  );
  app.put("/admin/project-manager/registry/groups/:id", async (request) =>
    ok(
      await service.updateRegistryGroup(
        idParamsSchema.parse(request.params).id,
        registrySaveSchema.partial().parse(request.body),
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/project-manager/registry/groups/:id/deactivate", async (request) =>
    ok(
      await service.setRegistryActive(
        "groups",
        idParamsSchema.parse(request.params).id,
        false,
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/project-manager/registry/groups/:id/restore", async (request) =>
    ok(
      await service.setRegistryActive(
        "groups",
        idParamsSchema.parse(request.params).id,
        true,
        actor(request)
      ),
      { requestId: request.id }
    )
  );

  app.get("/admin/project-manager/registry/modules", async (request) =>
    ok(await service.listRegistryModules(), { requestId: request.id })
  );
  app.post("/admin/project-manager/registry/modules", async (request) =>
    ok(await service.createRegistryModule(registrySaveSchema.parse(request.body), actor(request)), {
      requestId: request.id
    })
  );
  app.put("/admin/project-manager/registry/modules/:id", async (request) =>
    ok(
      await service.updateRegistryModule(
        idParamsSchema.parse(request.params).id,
        registrySaveSchema.partial().parse(request.body),
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/project-manager/registry/modules/:id/deactivate", async (request) =>
    ok(
      await service.setRegistryActive(
        "modules",
        idParamsSchema.parse(request.params).id,
        false,
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/project-manager/registry/modules/:id/restore", async (request) =>
    ok(
      await service.setRegistryActive(
        "modules",
        idParamsSchema.parse(request.params).id,
        true,
        actor(request)
      ),
      { requestId: request.id }
    )
  );

  app.get("/admin/project-manager/:kind/:id/attachments", async (request) => {
    const params = attachmentRecordParamsSchema.parse(request.params);
    return ok(await service.listAttachments(params.kind, params.id), {
      requestId: request.id
    });
  });
  app.post("/admin/project-manager/:kind/:id/attachments", async (request) => {
    const params = attachmentRecordParamsSchema.parse(request.params);
    const headers = attachmentHeadersSchema.parse(request.headers);
    if (!Buffer.isBuffer(request.body)) {
      throw AppError.validation("Attachment request body must be binary.");
    }
    return ok(
      await service.uploadAttachment(
        params.kind,
        params.id,
        {
          data: request.body,
          mimeType: headers["x-file-type"],
          originalName: decodeFileName(headers["x-file-name"])
        },
        actor(request)
      ),
      { requestId: request.id }
    );
  });
  app.get(
    "/admin/project-manager/:kind/:id/attachments/:attachmentId/download",
    async (request, reply) => {
      const params = attachmentParamsSchema.parse(request.params);
      const result = await service.downloadAttachment(params.kind, params.id, params.attachmentId);
      return reply
        .header("cache-control", "private, no-store")
        .header("content-type", result.attachment.mimeType)
        .header("content-length", String(result.attachment.sizeBytes))
        .header(
          "content-disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(result.attachment.originalName)}`
        )
        .send(result.data);
    }
  );
  app.delete("/admin/project-manager/:kind/:id/attachments/:attachmentId", async (request) => {
    const params = attachmentParamsSchema.parse(request.params);
    return ok(
      await service.deleteAttachment(params.kind, params.id, params.attachmentId, actor(request)),
      { requestId: request.id }
    );
  });

  app.get("/admin/project-manager/:kind", async (request) =>
    ok(await service.list(kindParamsSchema.parse(request.params).kind), {
      requestId: request.id
    })
  );
  app.post("/admin/project-manager/:kind", async (request) =>
    ok(
      await service.create(
        kindParamsSchema.parse(request.params).kind,
        itemSaveSchema.parse(request.body),
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.put("/admin/project-manager/:kind/:id", async (request) => {
    const params = itemParamsSchema.parse(request.params);
    return ok(
      await service.update(
        params.kind,
        params.id,
        itemSaveSchema.partial().parse(request.body),
        actor(request)
      ),
      { requestId: request.id }
    );
  });
  app.post("/admin/project-manager/:kind/:id/deactivate", async (request) => {
    const params = itemParamsSchema.parse(request.params);
    return ok(await service.deactivate(params.kind, params.id, actor(request)), {
      requestId: request.id
    });
  });
  app.post("/admin/project-manager/:kind/:id/restore", async (request) => {
    const params = itemParamsSchema.parse(request.params);
    return ok(await service.restore(params.kind, params.id, actor(request)), {
      requestId: request.id
    });
  });
  app.delete("/admin/project-manager/:kind/:id", async (request) => {
    const params = itemParamsSchema.parse(request.params);
    return ok(await service.delete(params.kind, params.id, actor(request)), {
      requestId: request.id
    });
  });
}

function decodeFileName(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function actor(request: FastifyRequest) {
  return requireNEOTActor().email?.trim() || requireNEOTActor().id || request.id;
}
