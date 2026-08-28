import OpenAI from "openai";
import { AppError } from "@neot/framework/errors";
import type { AgentIdePlanInput, AgentIdePlanResult } from "./orchestration.schemas.js";

type OpenAiSettings = {
  apiKey: string;
  baseUrl: string;
  model: string;
  reasoningEffort: "low" | "medium" | "high";
};

export class OpenAiPlanningGateway {
  status() {
    const settings = readOpenAiSettings();
    return {
      baseUrl: settings.baseUrl,
      configured: Boolean(settings.apiKey),
      model: settings.model,
      provider: "openai" as const,
      reasoningEffort: settings.reasoningEffort
    };
  }

  async createPlan(input: AgentIdePlanInput): Promise<AgentIdePlanResult> {
    const settings = readOpenAiSettings();
    if (!settings.apiKey) {
      throw new AppError({
        code: "MODEL_GATEWAY_UNAVAILABLE",
        message: "OpenAI is not configured. Set OPENAI_API_KEY and restart the API.",
        statusCode: 503
      });
    }

    const client = new OpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.baseUrl
    });
    const response = await client.responses.create({
      input: buildPlanningPrompt(input),
      model: settings.model,
      reasoning: { effort: settings.reasoningEffort }
    });
    const output = response.output_text.trim();
    if (!output) {
      throw new AppError({
        code: "MODEL_GATEWAY_EMPTY_RESPONSE",
        message: "OpenAI returned an empty planning result.",
        statusCode: 502
      });
    }

    return {
      model: settings.model,
      output,
      provider: "openai",
      responseId: response.id
    };
  }

  async testConnection() {
    const result = await this.createPlan({
      brief: "Confirm the planning connection. Return only: CONNECTION READY",
      provider: "openai",
      projectId: "connection-test",
      projectTitle: "NEOT Agent IDE"
    });
    return { ...this.status(), responseId: result.responseId };
  }
}

function buildPlanningPrompt(input: AgentIdePlanInput) {
  return `You are the Planning Agent inside NEOT.

Project: ${input.projectTitle}
Project reference: ${input.projectId}

Planning brief:
${input.brief}

Return a concise engineering plan in Markdown. Include: objective, assumptions, architecture impact, numbered small tasks, dependencies, risks, acceptance criteria, and final human approval point. Do not claim that you changed files or executed tools.`;
}

function readOpenAiSettings(): OpenAiSettings {
  const effort = process.env.OPENAI_REASONING_EFFORT;
  return {
    apiKey: process.env.OPENAI_API_KEY?.trim() ?? "",
    baseUrl: process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1",
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra",
    reasoningEffort: effort === "low" || effort === "high" ? effort : "medium"
  };
}
