import Anthropic from "@anthropic-ai/sdk";
import { createOpencodeClient } from "@opencode-ai/sdk";
import { OpenRouter } from "@openrouter/sdk";
import { AppError } from "@neot/framework/errors";
import OpenAI from "openai";
import { modelProviderRepository } from "./model-provider.repository.js";
import type { ModelProviderId, ModelProviderInput } from "./orchestration.schemas.js";

type StoredConnection = NonNullable<Awaited<ReturnType<typeof modelProviderRepository.find>>>;

const definitions: Record<ModelProviderId, ProviderDefinition> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    capabilities: ["coding", "reasoning", "streaming", "tools", "vision"],
    default: true,
    label: "OpenAI",
    model: "gpt-5.6-terra",
    runtime: "codex"
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com",
    capabilities: ["coding", "reasoning", "streaming", "tools", "vision"],
    default: false,
    label: "Claude",
    model: "claude-sonnet-4-5",
    runtime: "opencode"
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    capabilities: ["model-routing", "streaming", "tools"],
    default: false,
    label: "OpenRouter",
    model: "openai/gpt-5.2-codex",
    runtime: "opencode"
  },
  opencode: {
    baseUrl: "http://127.0.0.1:4096",
    capabilities: ["coding-runtime", "files", "streaming", "tools"],
    default: false,
    label: "OpenCode",
    model: "configured-by-opencode",
    runtime: "opencode"
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com",
    capabilities: ["coding", "reasoning", "streaming", "tools"],
    default: false,
    label: "DeepSeek",
    model: "deepseek-v4-pro",
    runtime: "opencode"
  }
};

export class ModelProviderService {
  async list(actorId: string) {
    const rows = await modelProviderRepository.list(actorId);
    return (Object.keys(definitions) as ModelProviderId[]).map((provider) =>
      publicStatus(
        provider,
        rows.find((row) => row.provider === provider)
      )
    );
  }

  defaults(provider: ModelProviderId) {
    const definition = definitions[provider];
    return { baseUrl: definition.baseUrl, label: definition.label, model: definition.model };
  }

  async save(provider: ModelProviderId, input: ModelProviderInput, actorId: string) {
    if (
      provider !== "opencode" &&
      !input.apiKey &&
      !(await modelProviderRepository.find(provider, actorId))
    ) {
      throw AppError.validation(`${definitions[provider].label} requires an API key.`);
    }
    await modelProviderRepository.save(provider, input, actorId);
    return this.requireStatus(provider, actorId);
  }

  async remove(provider: ModelProviderId, actorId: string) {
    if (provider === "openai") {
      throw AppError.validation(
        "OpenAI is the default provider. Replace its key instead of removing it."
      );
    }
    await modelProviderRepository.remove(provider, actorId);
    return { disconnected: true as const, provider };
  }

  async test(provider: ModelProviderId, actorId: string) {
    const connection = await this.require(provider, actorId);
    try {
      await testConnection(provider, connection, modelProviderRepository.secret(connection));
      await modelProviderRepository.recordTest(provider, actorId, null);
      return this.requireStatus(provider, actorId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `${definitions[provider].label} connection failed.`;
      await modelProviderRepository.recordTest(provider, actorId, message);
      throw new AppError({ code: "MODEL_PROVIDER_UNAVAILABLE", message, statusCode: 502 });
    }
  }

  async require(provider: ModelProviderId, actorId: string) {
    const connection = await modelProviderRepository.find(provider, actorId);
    if (!connection) {
      throw new AppError({
        code: "MODEL_PROVIDER_NOT_CONFIGURED",
        message: `${definitions[provider].label} is not configured. Open Agent Connector first.`,
        statusCode: 503
      });
    }
    return connection;
  }

  private async requireStatus(provider: ModelProviderId, actorId: string) {
    return publicStatus(provider, await this.require(provider, actorId));
  }
}

async function testConnection(
  provider: ModelProviderId,
  connection: StoredConnection,
  apiKey: string
) {
  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey, baseURL: connection.base_url });
    await client.messages.create({
      max_tokens: 8,
      messages: [{ content: "Reply READY", role: "user" }],
      model: connection.model
    });
    return;
  }
  if (provider === "openrouter") {
    const client = new OpenRouter({ apiKey, serverURL: connection.base_url });
    await client.models.count();
    return;
  }
  if (provider === "opencode") {
    const authorization = apiKey
      ? `Basic ${Buffer.from(`opencode:${apiKey}`).toString("base64")}`
      : undefined;
    const client = createOpencodeClient({
      baseUrl: connection.base_url,
      ...(authorization ? { headers: { Authorization: authorization } } : {})
    });
    await client.provider.list();
    return;
  }
  const client = new OpenAI({ apiKey, baseURL: connection.base_url });
  await client.models.list();
}

function publicStatus(provider: ModelProviderId, row?: StoredConnection) {
  const definition = definitions[provider];
  return {
    baseUrl: row?.base_url ?? definition.baseUrl,
    capabilities: definition.capabilities,
    configured: Boolean(row),
    connected: row?.status === "connected",
    default: definition.default,
    error: row?.last_error ?? null,
    label: row?.label ?? definition.label,
    lastTestedAt: row?.last_tested_at ? new Date(row.last_tested_at).toISOString() : null,
    model: row?.model ?? definition.model,
    provider,
    runtime: definition.runtime
  };
}

type ProviderDefinition = {
  baseUrl: string;
  capabilities: string[];
  default: boolean;
  label: string;
  model: string;
  runtime: "codex" | "opencode";
};

export const modelProviderService = new ModelProviderService();
