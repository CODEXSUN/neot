import type { FastifyInstance, FastifyReply, FastifyRequest, RouteOptions } from "fastify";
import { z } from "zod";
import { AppError } from "../errors/index.js";
import { ok } from "./envelope.js";

type AnySchema = z.ZodType<unknown>;

export type RouteSchemas = {
  body?: AnySchema;
  params?: AnySchema;
  querystring?: AnySchema;
  response: AnySchema;
};

export type ContractRouteContext<TSchemas extends RouteSchemas> = {
  body: TSchemas["body"] extends z.ZodType<infer TBody> ? TBody : undefined;
  params: TSchemas["params"] extends z.ZodType<infer TParams> ? TParams : undefined;
  query: TSchemas["querystring"] extends z.ZodType<infer TQuery> ? TQuery : undefined;
  reply: FastifyReply;
  request: FastifyRequest;
};

export type ContractRouteOptions<TSchemas extends RouteSchemas> = {
  handler: (
    context: ContractRouteContext<TSchemas>
  ) => Promise<z.output<TSchemas["response"]>> | z.output<TSchemas["response"]>;
  method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  preHandler?: RouteOptions["preHandler"];
  schemas: TSchemas;
  url: string;
};

/**
 * Registers a framework-owned HTTP boundary: inputs are parsed before business
 * code runs, successful data is checked before it leaves the module, and every
 * success uses the standard response envelope.
 */
export function registerContractRoute<TSchemas extends RouteSchemas>(
  app: FastifyInstance,
  options: ContractRouteOptions<TSchemas>
): void {
  app.route({
    method: options.method,
    url: options.url,
    ...(options.preHandler ? { preHandler: options.preHandler } : {}),
    handler: async (request, reply) => {
      const context = {
        body: parsePart(options.schemas.body, request.body, "body"),
        params: parsePart(options.schemas.params, request.params, "params"),
        query: parsePart(options.schemas.querystring, request.query, "querystring"),
        reply,
        request
      } as ContractRouteContext<TSchemas>;
      const data = await options.handler(context);
      const responseResult = options.schemas.response.safeParse(data);
      if (!responseResult.success) {
        request.log.error(
          {
            issues: responseResult.error.issues,
            route: options.url
          },
          "Response contract validation failed"
        );
        throw new Error("Response contract validation failed");
      }

      return ok(responseResult.data, {
        requestId: request.id,
        ...(request.correlationId ? { correlationId: request.correlationId } : {}),
        ...(request.tenantId ? { tenantId: request.tenantId } : {})
      });
    }
  });
}

function parsePart<TSchema extends AnySchema | undefined>(
  schema: TSchema,
  value: unknown,
  location: string
) {
  if (!schema) return undefined;

  const result = schema.safeParse(value);
  if (result.success) return result.data;

  throw AppError.validation(`Invalid request ${location}`, {
    issues: result.error.issues,
    location
  });
}
