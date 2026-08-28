import { randomBytes } from "node:crypto";
import { AppError } from "@neot/framework/errors";
import { sql } from "kysely";
import { getNEOTDatabase } from "../../database/neot-database.js";
import type { IdeaInput, PollInput } from "./ideas.types.js";
import { IdeaImageStorage, ideaImageAccessToken, validateIdeaImage } from "./ideas.storage.js";

const uid = () => randomBytes(4).toString("hex");
const parse = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export class IdeasRepository {
  private readonly db = getNEOTDatabase();
  private readonly imageStorage = new IdeaImageStorage();

  async list(actor: string) {
    const rows = await this.db
      .selectFrom("neot_ideas")
      .selectAll()
      .where((expression) =>
        expression.or([expression("visibility", "=", "public"), expression("author", "=", actor)])
      )
      .orderBy("updated_at", "desc")
      .execute();
    return Promise.all(rows.map((row) => this.mapIdea(row)));
  }

  async find(uuid: string, actor: string) {
    const row = await this.db
      .selectFrom("neot_ideas")
      .selectAll()
      .where("uuid", "=", uuid)
      .where((expression) =>
        expression.or([expression("visibility", "=", "public"), expression("author", "=", actor)])
      )
      .executeTakeFirst();
    if (!row) throw AppError.notFound("Idea was not found.");
    return this.mapIdea(row);
  }

  async create(input: IdeaInput, actor: string) {
    const uuid = uid();
    await this.db
      .insertInto("neot_ideas")
      .values({
        uuid,
        title: input.title,
        excerpt: input.excerpt,
        content_html: input.contentHtml,
        category: input.category,
        category_color: input.categoryColor,
        tags_json: JSON.stringify(input.tags),
        project_uuids_json: JSON.stringify(input.projectUuids),
        status: input.status,
        status_color: input.statusColor,
        visibility: "private",
        assignee_uuids_json: JSON.stringify(input.assigneeUuids),
        author: actor
      })
      .execute();
    return this.find(uuid, actor);
  }

  async update(
    uuid: string,
    input: { [Key in keyof IdeaInput]?: IdeaInput[Key] | undefined },
    actor: string
  ) {
    await this.find(uuid, actor);
    const values: Record<string, unknown> = {};
    if (input.title !== undefined) values.title = input.title;
    if (input.excerpt !== undefined) values.excerpt = input.excerpt;
    if (input.contentHtml !== undefined) values.content_html = input.contentHtml;
    if (input.category !== undefined) values.category = input.category;
    if (input.categoryColor !== undefined) values.category_color = input.categoryColor;
    if (input.tags !== undefined) values.tags_json = JSON.stringify(input.tags);
    if (input.projectUuids !== undefined)
      values.project_uuids_json = JSON.stringify(input.projectUuids);
    if (input.status !== undefined) values.status = input.status;
    if (input.statusColor !== undefined) values.status_color = input.statusColor;
    if (input.visibility !== undefined) values.visibility = input.visibility;
    if (input.assigneeUuids !== undefined)
      values.assignee_uuids_json = JSON.stringify(input.assigneeUuids);
    if (Object.keys(values).length)
      await this.db.updateTable("neot_ideas").set(values).where("uuid", "=", uuid).execute();
    return this.find(uuid, actor);
  }

  async remove(uuid: string, actor: string) {
    await this.find(uuid, actor);
    const storedImages = await this.db
      .selectFrom("neot_idea_attachments")
      .select("storage_key")
      .where("idea_uuid", "=", uuid)
      .where("storage_key", "is not", null)
      .execute();
    await this.db.transaction().execute(async (transaction) => {
      const comments = await transaction
        .selectFrom("neot_idea_comments")
        .select("uuid")
        .where("idea_uuid", "=", uuid)
        .execute();
      const poll = await transaction
        .selectFrom("neot_idea_polls")
        .select("uuid")
        .where("idea_uuid", "=", uuid)
        .executeTakeFirst();
      if (comments.length)
        await transaction
          .deleteFrom("neot_idea_likes")
          .where("entity_kind", "=", "comment")
          .where(
            "entity_uuid",
            "in",
            comments.map((comment) => comment.uuid)
          )
          .execute();
      if (poll)
        await transaction
          .deleteFrom("neot_idea_poll_votes")
          .where("poll_uuid", "=", poll.uuid)
          .execute();
      await transaction
        .deleteFrom("neot_idea_likes")
        .where("entity_kind", "=", "idea")
        .where("entity_uuid", "=", uuid)
        .execute();
      await transaction
        .deleteFrom("neot_idea_comments")
        .where("idea_uuid", "=", uuid)
        .execute();
      await transaction
        .deleteFrom("neot_idea_attachments")
        .where("idea_uuid", "=", uuid)
        .execute();
      await transaction
        .deleteFrom("neot_idea_drawings")
        .where("idea_uuid", "=", uuid)
        .execute();
      await transaction.deleteFrom("neot_idea_polls").where("idea_uuid", "=", uuid).execute();
      await transaction.deleteFrom("neot_ideas").where("uuid", "=", uuid).execute();
    });
    await Promise.all(storedImages.map((image) => this.imageStorage.remove(image.storage_key!)));
    return { deleted: true, uuid };
  }

  async comments(ideaUuid: string, actor: string) {
    await this.find(ideaUuid, actor);
    const rows = await this.db
      .selectFrom("neot_idea_comments")
      .selectAll()
      .where("idea_uuid", "=", ideaUuid)
      .orderBy("created_at")
      .execute();
    const upvotes = await this.likeCounts(
      "comment",
      rows.map((row) => row.uuid)
    );
    const downvotes = await this.likeCounts(
      "comment-down",
      rows.map((row) => row.uuid)
    );
    return rows.map((row) => ({
      uuid: row.uuid,
      ideaUuid: row.idea_uuid,
      parentUuid: row.parent_uuid,
      bodyHtml: row.body_html,
      author: row.author,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      likes: upvotes.get(row.uuid) ?? 0,
      dislikes: downvotes.get(row.uuid) ?? 0
    }));
  }

  async addComment(ideaUuid: string, bodyHtml: string, parentUuid: string | null, actor: string) {
    await this.find(ideaUuid, actor);
    if (parentUuid) {
      const parent = await this.db
        .selectFrom("neot_idea_comments")
        .select("idea_uuid")
        .where("uuid", "=", parentUuid)
        .executeTakeFirst();
      if (!parent || parent.idea_uuid !== ideaUuid)
        throw AppError.validation("Reply target is invalid.");
    }
    const uuid = uid();
    await this.db
      .insertInto("neot_idea_comments")
      .values({
        uuid,
        idea_uuid: ideaUuid,
        parent_uuid: parentUuid,
        body_html: bodyHtml,
        author: actor
      })
      .execute();
    return (await this.comments(ideaUuid, actor)).find((entry) => entry.uuid === uuid);
  }

  async toggleLike(kind: "idea" | "comment", entityUuid: string, actor: string) {
    await this.assertEntityAccess(kind, entityUuid, actor);
    const existing = await this.db
      .selectFrom("neot_idea_likes")
      .select("uuid")
      .where("entity_kind", "=", kind)
      .where("entity_uuid", "=", entityUuid)
      .where("actor", "=", actor)
      .executeTakeFirst();
    if (existing)
      await this.db.deleteFrom("neot_idea_likes").where("uuid", "=", existing.uuid).execute();
    else
      await this.db
        .insertInto("neot_idea_likes")
        .values({ uuid: uid(), entity_kind: kind, entity_uuid: entityUuid, actor })
        .execute();
    const result = await this.likeCounts(kind, [entityUuid]);
    return { liked: !existing, likes: result.get(entityUuid) ?? 0 };
  }

  async toggleReaction(
    entityKind: "comment" | "idea",
    entityUuid: string,
    vote: "up" | "down",
    actor: string
  ) {
    await this.assertEntityAccess(entityKind, entityUuid, actor);
    const kind = vote === "up" ? entityKind : `${entityKind}-down`;
    const oppositeKind = vote === "up" ? `${entityKind}-down` : entityKind;
    await this.db.transaction().execute(async (transaction) => {
      await transaction
        .deleteFrom("neot_idea_likes")
        .where("entity_kind", "=", oppositeKind)
        .where("entity_uuid", "=", entityUuid)
        .where("actor", "=", actor)
        .execute();
      const existing = await transaction
        .selectFrom("neot_idea_likes")
        .select("uuid")
        .where("entity_kind", "=", kind)
        .where("entity_uuid", "=", entityUuid)
        .where("actor", "=", actor)
        .executeTakeFirst();
      if (existing) {
        await transaction
          .deleteFrom("neot_idea_likes")
          .where("uuid", "=", existing.uuid)
          .execute();
      } else {
        await transaction
          .insertInto("neot_idea_likes")
          .values({ uuid: uid(), entity_kind: kind, entity_uuid: entityUuid, actor })
          .execute();
      }
    });
    const [upvotes, downvotes] = await Promise.all([
      this.likeCounts(entityKind, [entityUuid]),
      this.likeCounts(`${entityKind}-down`, [entityUuid])
    ]);
    return {
      downvotes: downvotes.get(entityUuid) ?? 0,
      upvotes: upvotes.get(entityUuid) ?? 0,
      vote
    };
  }

  async savePoll(ideaUuid: string, input: PollInput, actor: string) {
    await this.find(ideaUuid, actor);
    const existing = await this.db
      .selectFrom("neot_idea_polls")
      .select("uuid")
      .where("idea_uuid", "=", ideaUuid)
      .executeTakeFirst();
    const options = input.options.map((label, index) => ({ id: `option-${index + 1}`, label }));
    if (existing)
      await this.db
        .updateTable("neot_idea_polls")
        .set({
          question: input.question,
          options_json: JSON.stringify(options),
          multiple_choice: input.multipleChoice
        })
        .where("uuid", "=", existing.uuid)
        .execute();
    else
      await this.db
        .insertInto("neot_idea_polls")
        .values({
          uuid: uid(),
          idea_uuid: ideaUuid,
          question: input.question,
          options_json: JSON.stringify(options),
          multiple_choice: input.multipleChoice
        })
        .execute();
    return this.poll(ideaUuid);
  }

  async vote(ideaUuid: string, optionId: string, actor: string) {
    await this.find(ideaUuid, actor);
    const poll = await this.db
      .selectFrom("neot_idea_polls")
      .selectAll()
      .where("idea_uuid", "=", ideaUuid)
      .executeTakeFirst();
    if (!poll) throw AppError.notFound("Poll was not found.");
    const options = parse<Array<{ id: string; label: string }>>(poll.options_json, []);
    if (!options.some((option) => option.id === optionId))
      throw AppError.validation("Poll option is invalid.");
    if (!poll.multiple_choice)
      await this.db
        .deleteFrom("neot_idea_poll_votes")
        .where("poll_uuid", "=", poll.uuid)
        .where("actor", "=", actor)
        .execute();
    await this.db
      .insertInto("neot_idea_poll_votes")
      .ignore()
      .values({ uuid: uid(), poll_uuid: poll.uuid, option_id: optionId, actor })
      .execute();
    return this.poll(ideaUuid);
  }

  async addAttachment(
    ideaUuid: string,
    input: { data: Buffer; name: string; type: string },
    actor: string
  ) {
    await this.find(ideaUuid, actor);
    const image = validateIdeaImage(input.data, input.type, input.name);
    const uuid = uid();
    const storageKey = await this.imageStorage.write(ideaUuid, image.name, input.data);
    try {
      await this.db
        .insertInto("neot_idea_attachments")
        .values({
          uuid,
          idea_uuid: ideaUuid,
          name: image.name,
          mime_type: image.mimeType,
          size_bytes: input.data.byteLength,
          data_base64: "",
          storage_key: storageKey,
          created_by: actor
        })
        .execute();
    } catch (error) {
      await this.imageStorage.remove(storageKey);
      throw error;
    }
    return this.mapAttachment({
      uuid,
      idea_uuid: ideaUuid,
      name: image.name,
      mime_type: image.mimeType,
      size_bytes: input.data.byteLength,
      data_base64: "",
      storage_key: storageKey
    });
  }

  async attachmentImage(ideaUuid: string, attachmentUuid: string) {
    const attachment = await this.db
      .selectFrom("neot_idea_attachments")
      .selectAll()
      .where("idea_uuid", "=", ideaUuid)
      .where("uuid", "=", attachmentUuid)
      .executeTakeFirst();
    if (!attachment) throw AppError.notFound("Idea image was not found.");
    const data = attachment.storage_key
      ? await this.imageStorage.read(attachment.storage_key)
      : Buffer.from(attachment.data_base64, "base64");
    return { data, mimeType: attachment.mime_type, name: attachment.name };
  }

  async saveDrawing(ideaUuid: string, scene: unknown, actor: string) {
    await this.find(ideaUuid, actor);
    const existing = await this.db
      .selectFrom("neot_idea_drawings")
      .select("uuid")
      .where("idea_uuid", "=", ideaUuid)
      .executeTakeFirst();
    if (existing)
      await this.db
        .updateTable("neot_idea_drawings")
        .set({ scene_json: JSON.stringify(scene), updated_by: actor })
        .where("uuid", "=", existing.uuid)
        .execute();
    else
      await this.db
        .insertInto("neot_idea_drawings")
        .values({
          uuid: uid(),
          idea_uuid: ideaUuid,
          scene_json: JSON.stringify(scene),
          updated_by: actor
        })
        .execute();
    return { scene };
  }

  private async mapIdea(row: any) {
    const [comments, attachments, poll, likes, dislikes] = await Promise.all([
      this.db
        .selectFrom("neot_idea_comments")
        .select([
          sql<number>`sum(case when parent_uuid is null then 1 else 0 end)`.as("comments"),
          sql<number>`sum(case when parent_uuid is not null then 1 else 0 end)`.as("replies")
        ])
        .where("idea_uuid", "=", row.uuid)
        .executeTakeFirst(),
      this.db
        .selectFrom("neot_idea_attachments")
        .selectAll()
        .where("idea_uuid", "=", row.uuid)
        .orderBy("created_at")
        .execute(),
      this.poll(row.uuid),
      this.likeCounts("idea", [row.uuid]),
      this.likeCounts("idea-down", [row.uuid])
    ]);
    const drawing = await this.db
      .selectFrom("neot_idea_drawings")
      .select("scene_json")
      .where("idea_uuid", "=", row.uuid)
      .executeTakeFirst();
    return {
      uuid: row.uuid,
      referenceNumber: Number(row.id),
      title: row.title,
      excerpt: row.excerpt,
      contentHtml: row.content_html,
      category: row.category,
      categoryColor: row.category_color,
      tags: parse<string[]>(row.tags_json, []),
      projectUuids: parse<string[]>(row.project_uuids_json, []),
      status: row.status,
      statusColor: row.status_color,
      visibility: row.visibility,
      assigneeUuids: parse<string[]>(row.assignee_uuids_json, []),
      author: row.author,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      likes: likes.get(row.uuid) ?? 0,
      dislikes: dislikes.get(row.uuid) ?? 0,
      commentCount: Number(comments?.comments ?? 0),
      replyCount: Number(comments?.replies ?? 0),
      attachments: attachments.map((item) => this.mapAttachment(item)),
      poll,
      drawing: drawing ? parse(drawing.scene_json, { elements: [] }) : null
    };
  }

  private mapAttachment(item: {
    uuid: string;
    idea_uuid: string;
    name: string;
    mime_type: string;
    size_bytes: number;
    data_base64: string;
    storage_key: string | null;
  }) {
    const imageUrl = `/api/neot/ideas/${item.idea_uuid}/attachments/${item.uuid}/image?access=${ideaImageAccessToken(item.idea_uuid, item.uuid)}`;
    return {
      uuid: item.uuid,
      ideaUuid: item.idea_uuid,
      name: item.name,
      mimeType: item.mime_type,
      sizeBytes: item.size_bytes,
      url: imageUrl,
      dataUrl: item.storage_key ? imageUrl : `data:${item.mime_type};base64,${item.data_base64}`
    };
  }

  private async poll(ideaUuid: string) {
    const row = await this.db
      .selectFrom("neot_idea_polls")
      .selectAll()
      .where("idea_uuid", "=", ideaUuid)
      .executeTakeFirst();
    if (!row) return null;
    const votes = await this.db
      .selectFrom("neot_idea_poll_votes")
      .select(["option_id", sql<number>`count(*)`.as("count")])
      .where("poll_uuid", "=", row.uuid)
      .groupBy("option_id")
      .execute();
    const counts = new Map(votes.map((vote) => [vote.option_id, Number(vote.count)]));
    return {
      uuid: row.uuid,
      question: row.question,
      multipleChoice: Boolean(row.multiple_choice),
      options: parse<Array<{ id: string; label: string }>>(row.options_json, []).map((option) => ({
        ...option,
        votes: counts.get(option.id) ?? 0
      }))
    };
  }

  private async likeCounts(kind: string, uuids: string[]) {
    if (!uuids.length) return new Map<string, number>();
    const rows = await this.db
      .selectFrom("neot_idea_likes")
      .select(["entity_uuid", sql<number>`count(*)`.as("count")])
      .where("entity_kind", "=", kind)
      .where("entity_uuid", "in", uuids)
      .groupBy("entity_uuid")
      .execute();
    return new Map(rows.map((row) => [row.entity_uuid, Number(row.count)]));
  }

  private async assertEntityAccess(kind: "comment" | "idea", uuid: string, actor: string) {
    if (kind === "idea") {
      await this.find(uuid, actor);
      return;
    }
    const comment = await this.db
      .selectFrom("neot_idea_comments")
      .select("idea_uuid")
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    if (!comment) throw AppError.notFound("Idea comment was not found.");
    await this.find(comment.idea_uuid, actor);
  }
}
