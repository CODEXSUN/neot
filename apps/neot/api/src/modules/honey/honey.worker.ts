import { TaskManagerService } from "../task-manager/index.js";
import type { Todo } from "../task-manager/index.js";
import type { HoneyPageContext } from "./honey.service.js";

export type HoneyWorkerContext = {
  actorEmail: string;
  page: HoneyPageContext;
};

export type HoneyWorkerResult = {
  message: string;
};

type HoneyWorker = {
  canHandle(message: string): boolean;
  execute(message: string, context: HoneyWorkerContext): Promise<HoneyWorkerResult>;
  name: string;
};

const taskScope = "super-admin";

class HoneyWorkerRegistry {
  private readonly workers: HoneyWorker[] = [];

  register(worker: HoneyWorker) {
    this.workers.push(worker);
    return this;
  }

  async execute(message: string, context: HoneyWorkerContext) {
    const worker = this.workers.find((candidate) => candidate.canHandle(message));
    return worker?.execute(message, context) ?? null;
  }
}

class TodaysWorkWorker implements HoneyWorker {
  readonly name = "today-work";

  constructor(private readonly tasks = new TaskManagerService()) {}

  canHandle(message: string) {
    return /\b(?:today'?s work|work for today|what (?:do i|should i) (?:do|work on) today|organise my work)\b/iu.test(
      message
    );
  }

  async execute(_message: string, context: HoneyWorkerContext) {
    const todos = await this.tasks.list(taskScope, context.actorEmail);
    const important = prioritize(todos).slice(0, 5);
    if (!important.length) {
      return {
        message:
          "You have no open work for today. I can add a todo or help plan the next project step."
      };
    }
    const lines = important.map((todo, index) => `${index + 1}. ${todo.title}${taskHint(todo)}`);
    return {
      message: `Here is your most important work:\n${lines.join("\n")}\n\nOpen My Work to review the full list.`
    };
  }
}

class CreateTodoWorker implements HoneyWorker {
  readonly name = "create-todo";

  constructor(private readonly tasks = new TaskManagerService()) {}

  canHandle(message: string) {
    return /\b(?:add|create|make|post)\s+(?:a\s+|new\s+)?(?:task|todo)\b/iu.test(message);
  }

  async execute(message: string, context: HoneyWorkerContext) {
    const parsed = parseHoneyTodoRequest(message);
    if (!parsed.title) {
      return {
        message:
          "Tell me the todo subject, for example: Hi Honey, add a task as Call the client at 4pm."
      };
    }
    const todo = await this.tasks.create(
      taskScope,
      {
        description: parsed.timeLabel ? `Scheduled for ${parsed.timeLabel}` : "Created by Honey",
        dueDate: parsed.timeLabel ? localDate() : "",
        priority: inferPriority(message),
        projectId: context.page.projectId ?? "",
        title: parsed.title
      },
      context.actorEmail
    );
    return {
      message: `Done — I added “${todo.title}”${parsed.timeLabel ? ` for ${parsed.timeLabel}` : ""}${context.page.projectTitle ? ` under ${context.page.projectTitle}` : ""}.`
    };
  }
}

export const honeyWorkerRegistry = new HoneyWorkerRegistry()
  .register(new TodaysWorkWorker())
  .register(new CreateTodoWorker());

function prioritize(todos: Todo[]) {
  const today = localDate();
  return todos
    .filter((todo) => !/^(?:completed|done|closed|cancelled)$/iu.test(todo.status))
    .filter((todo) => !todo.dueDate || todo.dueDate <= today)
    .sort(
      (left, right) => score(right, today) - score(left, today) || left.position - right.position
    );
}

function score(todo: Todo, today: string) {
  const priority =
    { critical: 40, high: 30, medium: 20, low: 10 }[todo.priority.toLowerCase()] ?? 20;
  const due = todo.dueDate && todo.dueDate < today ? 30 : todo.dueDate === today ? 20 : 0;
  return priority + due;
}

function taskHint(todo: Todo) {
  const hints = [
    todo.priority && todo.priority !== "medium" ? todo.priority : "",
    todo.dueDate ? `due ${todo.dueDate}` : ""
  ].filter(Boolean);
  return hints.length ? ` (${hints.join(", ")})` : "";
}

export function parseHoneyTodoRequest(message: string) {
  const subject = message
    .replace(/^\s*(?:hi|hey|hello)\s+honey[,!]?\s*/iu, "")
    .replace(
      /^.*?\b(?:add|create|make|post)\s+(?:a\s+|new\s+)?(?:task|todo)\s*(?:(?:as|to|for)\b|:)?\s*/iu,
      ""
    )
    .trim();
  const time = subject.match(/\b(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/iu)?.[1];
  const title = subject
    .replace(/\s+\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b[.!]?\s*$/iu, "")
    .trim()
    .replace(/[.!]+$/u, "")
    .slice(0, 240);
  return { timeLabel: time ? normalizeTime(time) : "", title };
}

function inferPriority(message: string) {
  if (/\b(?:urgent|critical|immediately)\b/iu.test(message)) return "critical";
  if (/\b(?:important|high priority|asap)\b/iu.test(message)) return "high";
  return "medium";
}

function normalizeTime(value: string) {
  return value.replace(/\s+/gu, "").toUpperCase();
}

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
