import { randomBytes } from "node:crypto";
import { getNEOTDatabase } from "../../database/neot-database.js";
import { decryptProviderSecret, encryptProviderSecret } from "./model-provider.crypto.js";
import type { ModelProviderId, ModelProviderInput } from "./orchestration.schemas.js";

export class ModelProviderRepository {
  private readonly database = getNEOTDatabase();

  async list(actorId: string) {
    return this.database
      .selectFrom("neot_model_provider_connections")
      .selectAll()
      .where("actor_id", "=", actorId)
      .orderBy("provider")
      .execute();
  }

  async find(provider: ModelProviderId, actorId: string) {
    return this.database
      .selectFrom("neot_model_provider_connections")
      .selectAll()
      .where("actor_id", "=", actorId)
      .where("provider", "=", provider)
      .executeTakeFirst();
  }

  async save(provider: ModelProviderId, input: ModelProviderInput, actorId: string) {
    const existing = await this.find(provider, actorId);
    const encryptedApiKey = input.apiKey
      ? encryptProviderSecret(input.apiKey)
      : (existing?.encrypted_api_key ?? null);
    const values = {
      actor_id: actorId,
      base_url: input.baseUrl,
      encrypted_api_key: encryptedApiKey,
      label: input.label,
      last_error: null,
      model: input.model,
      provider,
      status: "configured"
    };
    if (existing) {
      await this.database
        .updateTable("neot_model_provider_connections")
        .set(values)
        .where("uuid", "=", existing.uuid)
        .executeTakeFirst();
    } else {
      await this.database
        .insertInto("neot_model_provider_connections")
        .values({ ...values, uuid: randomBytes(8).toString("hex") })
        .executeTakeFirstOrThrow();
    }
    return this.find(provider, actorId);
  }

  async recordTest(provider: ModelProviderId, actorId: string, error: string | null) {
    await this.database
      .updateTable("neot_model_provider_connections")
      .set({ last_error: error, last_tested_at: new Date(), status: error ? "error" : "connected" })
      .where("actor_id", "=", actorId)
      .where("provider", "=", provider)
      .executeTakeFirst();
  }

  async remove(provider: ModelProviderId, actorId: string) {
    await this.database
      .deleteFrom("neot_model_provider_connections")
      .where("actor_id", "=", actorId)
      .where("provider", "=", provider)
      .executeTakeFirst();
  }

  secret(row: { encrypted_api_key: string | null }) {
    return row.encrypted_api_key ? decryptProviderSecret(row.encrypted_api_key) : "";
  }
}

export const modelProviderRepository = new ModelProviderRepository();
