import type { FastifyInstance, FastifyRequest } from "fastify";
import { fail, ok } from "@neot/framework/http";
import { z } from "zod";
import { env } from "../env.js";
import { AuthService } from "./auth.service.js";
import { verifyAuthToken } from "./jwt.js";

const authService = new AuthService();
const loginBody = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(1)
  })
  .strict();
const registerBody = z
  .object({
    email: z.string().trim().email(),
    name: z.string().trim().min(2).max(120),
    password: z.string().min(8).max(128),
    role: z.enum(["student", "master"])
  })
  .strict();

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const parsed = registerBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send(
        fail(
          {
            code: "AUTH_INVALID_REGISTRATION",
            message: "Name, email, an 8-character password, and a learning role are required."
          },
          { requestId: request.id }
        )
      );
    }
    return ok(await authService.register(parsed.data), { requestId: request.id });
  });
  app.post("/auth/development/login", async (request, reply) => {
    if (env.NODE_ENV !== "development" || env.DEV_AUTO_LOGIN !== "1") {
      return reply
        .code(404)
        .send(
          fail(
            { code: "AUTH_DEVELOPMENT_LOGIN_DISABLED", message: "Development login is disabled." },
            { requestId: request.id }
          )
        );
    }
    const result = await authService.login({
      email: env.INITIAL_ADMIN_EMAIL,
      password: env.INITIAL_ADMIN_PASSWORD
    });
    if (!result) {
      return reply.code(401).send(
        fail(
          {
            code: "AUTH_DEVELOPMENT_LOGIN_FAILED",
            message: "Development credentials are invalid."
          },
          { requestId: request.id }
        )
      );
    }
    return ok(result, { requestId: request.id });
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send(
          fail(
            { code: "AUTH_INVALID_REQUEST", message: "Email and password are required." },
            { requestId: request.id }
          )
        );
    }
    const result = await authService.login(parsed.data);
    if (!result) {
      return reply
        .code(401)
        .send(
          fail(
            { code: "AUTH_INVALID_CREDENTIALS", message: "Invalid credentials." },
            { requestId: request.id }
          )
        );
    }
    return ok(result, { requestId: request.id });
  });

  app.get("/auth/session", async (request, reply) => {
    const token = bearerToken(request);
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) {
      return reply
        .code(401)
        .send(
          fail(
            { code: "AUTH_SESSION_EXPIRED", message: "Session expired. Please sign in again." },
            { requestId: request.id }
          )
        );
    }
    return ok(
      {
        authenticated: true,
        email: payload.email,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        name: payload.name,
        permissions: payload.permissions ?? [],
        role: payload.role,
        sessionIssuedAt: payload.sessionIssuedAt
      },
      { requestId: request.id }
    );
  });

  app.post("/auth/logout", async (request) => ok({ loggedOut: true }, { requestId: request.id }));
}

function bearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  return authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
}
