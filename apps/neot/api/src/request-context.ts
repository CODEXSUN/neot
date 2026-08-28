import { AsyncLocalStorage } from "node:async_hooks";

export type NEOTActor = {
  email?: string;
  id: string;
  permissions: readonly string[];
  roles: readonly string[];
};

export type NEOTUserReference = {
  email: string;
  id: number;
  name: string;
  uuid: string;
};

export type NEOTUserDirectory = {
  find(id: number): Promise<NEOTUserReference | null>;
  list(): Promise<NEOTUserReference[]>;
};

const actorContext = new AsyncLocalStorage<NEOTActor>();
const userDirectoryContext = new AsyncLocalStorage<NEOTUserDirectory>();

export function runWithNEOTActor<T>(actor: NEOTActor, callback: () => T) {
  return actorContext.run(actor, callback);
}

export function requireNEOTActor() {
  const actor = actorContext.getStore();
  if (!actor) throw new Error("NEOT requires a CXApp-provided actor.");
  return actor;
}

export function runWithNEOTUserDirectory<T>(
  directory: NEOTUserDirectory,
  callback: () => T
) {
  return userDirectoryContext.run(directory, callback);
}

export function requireNEOTUserDirectory() {
  const directory = userDirectoryContext.getStore();
  if (!directory) throw new Error("NEOT requires a host-provided user directory.");
  return directory;
}
