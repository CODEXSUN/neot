import type { FastifyInstance } from "fastify";

export type ShutdownHook = () => Promise<void> | void;

export type GracefulShutdownOptions = {
  hooks?: ShutdownHook[];
  signals?: NodeJS.Signals[];
  timeoutMs?: number;
};

type ShutdownState = {
  shuttingDown: boolean;
};

const shutdownState = new WeakMap<FastifyInstance, ShutdownState>();

function getShutdownState(app: FastifyInstance): ShutdownState {
  let state = shutdownState.get(app);

  if (!state) {
    state = { shuttingDown: false };
    shutdownState.set(app, state);
  }

  return state;
}

export function registerShutdownHooks(app: FastifyInstance, hooks: ShutdownHook[]): void {
  for (const hook of hooks) {
    app.addHook("onClose", async () => {
      await hook();
    });
  }
}

export function registerGracefulShutdown(
  app: FastifyInstance,
  options: GracefulShutdownOptions = {}
): void {
  const signals = options.signals ?? ["SIGTERM", "SIGINT"];
  const timeoutMs = options.timeoutMs ?? 30_000;

  if (options.hooks?.length) {
    registerShutdownHooks(app, options.hooks);
  }

  const shutdown = async (signal: NodeJS.Signals) => {
    const state = getShutdownState(app);

    if (state.shuttingDown) {
      app.log.warn({ signal }, "Shutdown already in progress; forcing exit");
      process.exit(1);
      return;
    }

    state.shuttingDown = true;
    app.log.info({ signal }, "Graceful shutdown started");

    const forceExitTimer = setTimeout(() => {
      app.log.error({ timeoutMs }, "Graceful shutdown timed out; forcing exit");
      process.exit(1);
    }, timeoutMs);

    forceExitTimer.unref();

    try {
      app.log.info("Closing HTTP listeners");
      await app.close();
      app.log.info("HTTP listeners closed and shutdown hooks completed");
      clearTimeout(forceExitTimer);
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error }, "Graceful shutdown failed");
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  };

  for (const signal of signals) {
    process.once(signal, () => {
      void shutdown(signal);
    });
  }
}
