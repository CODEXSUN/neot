import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@neot/framework/errors";
import { registerContractRoute } from "@neot/framework/http";
import { identityContext } from "../../auth/identity-context.js";
import { signAuthToken, verifyAuthToken } from "../../auth/jwt.js";
import { UserService } from "./user.service.js";

const path = "/identity/users";
const status = z.enum(["active", "inactive", "suspended"]);
const record = z.object({
  email: z.string(),
  id: z.number().int().positive(),
  isProtected: z.boolean(),
  name: z.string(),
  role: z.string(),
  status,
  uuid: z.string().length(8)
});
const payload = z.object({
  email: z.string().email(),
  name: z.string().trim().min(2).max(180),
  password: z.string().min(8).max(128).optional(),
  roleId: z.number().int().positive().optional(),
  status
});
const profilePayload = z
  .object({
    email: z.string().trim().email(),
    name: z.string().trim().min(2).max(180),
    password: z.string().min(8).max(128).optional()
  })
  .strict();
const profileRecord = record.pick({ email: true, id: true, name: true, uuid: true });
const profileResponse = z.object({ accessToken: z.string(), profile: profileRecord });
const params = z.object({ id: z.string().regex(/^\d+$/) });
const query = z.object({ search: z.string().trim().optional() });
export async function registerUserRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: "/identity/profile",
    schemas: { response: profileRecord },
    handler: ({ request }) => new UserService(identityContext(request)).getProfile()
  });
  registerContractRoute(app, {
    method: "PUT",
    url: "/identity/profile",
    schemas: { body: profilePayload, response: profileResponse },
    handler: async ({ body, request }) => {
      const profile = await new UserService(identityContext(request)).updateProfile(body);
      const claims = sessionClaims(request.headers.authorization);
      return {
        profile,
        accessToken: signAuthToken({
          email: profile.email,
          name: profile.name,
          userId: profile.uuid,
          ...(claims.role ? { role: claims.role } : {}),
          ...(claims.permissions ? { permissions: claims.permissions } : {})
        })
      };
    }
  });
  registerContractRoute(app, {
    method: "GET",
    url: path,
    schemas: { querystring: query, response: z.array(record) },
    handler: ({ query, request }) =>
      new UserService(identityContext(request)).list(query.search ? { search: query.search } : {})
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${path}/:id`,
    schemas: { params, response: record },
    handler: async ({ params, request }) => {
      const value = await new UserService(identityContext(request)).get(params.id);
      if (!value) throw AppError.notFound("User was not found.");
      return value;
    }
  });
  registerContractRoute(app, {
    method: "POST",
    url: path,
    schemas: { body: payload, response: record },
    handler: ({ body, request }) => new UserService(identityContext(request)).create(body)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${path}/:id`,
    schemas: { body: payload, params, response: record },
    handler: ({ body, params, request }) =>
      new UserService(identityContext(request)).update(params.id, body)
  });
  action(app, "activate", "active");
  action(app, "deactivate", "inactive");
  action(app, "suspend", "suspended");
  registerContractRoute(app, {
    method: "DELETE",
    url: `${path}/:id/force`,
    schemas: { params, response: record },
    handler: ({ params, request }) =>
      new UserService(identityContext(request)).forceDelete(params.id)
  });
}
function sessionClaims(authorization: string | undefined) {
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const claims = token ? verifyAuthToken(token) : null;
  if (!claims) throw AppError.unauthorized("Session expired.");
  return claims;
}
function action(app: FastifyInstance, name: string, value: z.infer<typeof status>) {
  registerContractRoute(app, {
    method: "POST",
    url: `${path}/:id/${name}`,
    schemas: { params, response: record },
    handler: ({ params, request }) =>
      new UserService(identityContext(request)).setStatus(params.id, value)
  });
}
