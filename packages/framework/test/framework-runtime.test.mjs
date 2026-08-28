import assert from "node:assert/strict";
import test from "node:test";
import { createApiApp, registerHealthRoute } from "@neot/framework/api";
import { registerContractRoute } from "@neot/framework/http";
import { z } from "zod";

const cookieSecret = "framework-test-cookie-secret-32-bytes";

async function createTestApp() {
  return createApiApp({
    appName: "framework-test",
    cookieSecret,
    corsOrigins: [],
    environment: "development"
  });
}

test("contract routes return a validation envelope for invalid request input", async (t) => {
  const app = await createTestApp();
  t.after(() => app.close());

  registerContractRoute(app, {
    method: "POST",
    schemas: {
      body: z.object({ name: z.string().min(1) }).strict(),
      response: z.object({ name: z.string() })
    },
    url: "/contracts/request",
    handler: ({ body }) => body
  });

  const response = await app.inject({
    method: "POST",
    payload: {},
    url: "/contracts/request"
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, "VALIDATION_ERROR");
});

test("contract routes hide invalid server responses behind an internal error", async (t) => {
  const app = await createTestApp();
  t.after(() => app.close());

  registerContractRoute(app, {
    method: "GET",
    schemas: {
      response: z.object({ value: z.string() })
    },
    url: "/contracts/response",
    handler: () => ({ value: 42 })
  });

  const response = await app.inject({
    method: "GET",
    url: "/contracts/response"
  });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.json().error, {
    code: "INTERNAL_ERROR",
    message: "Something went wrong"
  });
});

test("tenant context trims the tenant header before echoing and enveloping it", async (t) => {
  const app = await createTestApp();
  t.after(() => app.close());

  const response = await app.inject({
    headers: {
      "x-tenant-id": " tenant-1 "
    },
    method: "GET",
    url: "/"
  });

  assert.equal(response.headers["x-tenant-id"], "tenant-1");
  assert.equal(response.json().meta.tenantId, "tenant-1");
});

test("single-client APIs can disable tenant request context", async (t) => {
  const app = await createApiApp({
    appName: "framework-single-client-test",
    cookieSecret,
    corsOrigins: [],
    environment: "development",
    tenantContext: false
  });
  t.after(() => app.close());

  const response = await app.inject({
    headers: {
      "x-tenant-id": "must-not-be-consumed"
    },
    method: "GET",
    url: "/"
  });

  assert.equal(response.headers["x-tenant-id"], undefined);
  assert.equal(response.json().meta.tenantId, undefined);
});

test("health checks continue after an exception and return a down envelope", async (t) => {
  const app = await createTestApp();
  t.after(() => app.close());

  registerHealthRoute(app, [
    {
      name: "database",
      check() {
        throw new Error("connection details must not leak");
      }
    },
    {
      name: "storage",
      check() {
        return { status: "ok" };
      }
    }
  ]);

  const response = await app.inject({
    method: "GET",
    url: "/health"
  });
  const body = response.json();

  assert.equal(response.statusCode, 503);
  assert.equal(body.data.status, "down");
  assert.equal(body.data.checks.database.status, "down");
  assert.equal(body.data.checks.storage.status, "ok");
  assert.doesNotMatch(JSON.stringify(body), /connection details/);
});
