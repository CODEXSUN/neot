import type { FastifyInstance } from "fastify";

/** Dependencies available to every Platform module at composition time. */
export type PlatformModuleDependencies = {
  app: FastifyInstance;
};
