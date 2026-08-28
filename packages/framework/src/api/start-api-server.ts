import type { FastifyInstance } from "fastify";

type StartApiServerOptions = {
  app: FastifyInstance;
  host: string;
  port: number;
  readyLabel: string;
  retries?: number;
  retryDelayMs?: number;
};

function isAddressInUseError(error: unknown): error is { code: "EADDRINUSE" } {
  return (
    typeof error === "object" && error !== null && "code" in error && error.code === "EADDRINUSE"
  );
}

export async function startApiServer(options: StartApiServerOptions) {
  const retries = options.retries ?? 15;
  const retryDelayMs = options.retryDelayMs ?? 250;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const address = await options.app.listen({
        host: options.host,
        port: options.port
      });
      console.info(`[server.listen] ${address}`);
      console.info(options.readyLabel.replace("{address}", address));
      return address;
    } catch (error) {
      if (isAddressInUseError(error) && attempt < retries) {
        options.app.log.warn(
          `Port ${options.port} in use, retrying in ${retryDelayMs}ms... (attempt ${attempt}/${retries})`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        continue;
      }

      options.app.log.error({ err: error }, "Server start failed");
      try {
        await options.app.close();
      } catch {}
      throw error;
    }
  }

  throw new Error(`Unable to start server on ${options.host}:${options.port}`);
}
