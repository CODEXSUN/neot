import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "@neot/framework/errors";
import { InMemoryEventPublisher } from "@neot/framework/events";
import { ModuleRegistry, defineModule, registerModules } from "@neot/framework/modules";
import {
  InMemoryQueueAdapter,
  InMemoryQueueAdapterV2,
  SwitchableQueueAdapter
} from "@neot/framework/queue";

test("module composition is ordered and rejects duplicate keys", async () => {
  const registrations = [];
  const module = defineModule({
    key: "example",
    label: "Example",
    register({ value }) {
      registrations.push(value);
    }
  });

  await registerModules([module], { value: "registered" });
  assert.deepEqual(registrations, ["registered"]);

  await assert.rejects(
    registerModules([module, module], { value: "duplicate" }),
    /Module already composed: example/
  );
});

test("module registry rejects duplicate contracts", () => {
  const registry = new ModuleRegistry();
  const contract = {
    displayName: "Example",
    moduleKey: "example",
    scope: "platform",
    version: "1.0.0"
  };

  registry.register(contract);
  assert.equal(registry.get("example"), contract);
  assert.throws(() => registry.register(contract), /Module already registered: example/);
});

test("application errors retain stable HTTP error contracts", () => {
  const error = AppError.conflict("Already exists", { field: "name" });

  assert.equal(error.code, "CONFLICT");
  assert.equal(error.statusCode, 409);
  assert.deepEqual(error.details, { field: "name" });
});

test("in-memory adapters collect deterministic test data", async () => {
  const events = new InMemoryEventPublisher();
  const queue = new InMemoryQueueAdapter();

  await events.publish({
    eventName: "example.created",
    eventVersion: 1,
    occurredAt: "2026-07-23T00:00:00.000Z",
    payload: { id: 1 }
  });
  await queue.enqueue("example", {
    jobName: "example.sync",
    payload: { id: 1 }
  });

  assert.equal(events.events.length, 1);
  assert.equal(queue.jobs.length, 1);
});

test("queue V2 deduplicates jobs and switches only to healthy backends", async () => {
  const database = new InMemoryQueueAdapterV2("database");
  const redis = new InMemoryQueueAdapterV2("bullmq-redis");
  const queue = new SwitchableQueueAdapter({
    adapters: [database, redis],
    initialBackend: "database"
  });
  const job = {
    idempotencyKey: "queue-test-1",
    jobName: "test.run",
    jobVersion: 1,
    payload: { value: 1 }
  };

  const accepted = await queue.current().enqueueJob("test", job);
  const duplicate = await queue.current().enqueueJob("test", job);
  assert.equal(accepted.deduplicated, false);
  assert.equal(duplicate.deduplicated, true);

  const health = await queue.switchTo("bullmq-redis");
  assert.equal(health.status, "available");
  assert.equal(queue.backend(), "bullmq-redis");
  await queue.close();
});
