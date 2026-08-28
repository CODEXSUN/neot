import { Button } from "@neot/ui/components/button";
import { Textarea } from "@neot/ui/components/textarea";
import {
  ArrowLeftIcon,
  MessageCircleIcon,
  PencilIcon,
  ReplyIcon,
  Share2Icon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UserRoundIcon
} from "lucide-react";
import DOMPurify from "dompurify";
import { useState } from "react";
import { toast } from "sonner";
import { useProjectManagerRecordsQuery } from "../project-manager/project-manager.hooks";
import { useIdea, useIdeaActions, useIdeaComments, useIdeaUsers } from "./ideas.hooks";
import type { IdeaComment } from "./ideas.types";

export function IdeaDetail({ uuid }: { uuid: string }) {
  const query = useIdea(uuid);
  const comments = useIdeaComments(uuid);
  const projects = useProjectManagerRecordsQuery("project");
  const users = useIdeaUsers();
  const actions = useIdeaActions();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const idea = query.data;
  if (!idea)
    return <main className="grid min-h-[70vh] place-items-center">Loading discussion…</main>;
  const projectNames = idea.projectUuids.map(
    (id) => projects.data?.find((project) => project.id === id)?.title ?? id
  );
  const assignees = idea.assigneeUuids.map(
    (uuid) => users.data?.find((user) => user.uuid === uuid)?.name ?? "Unavailable user"
  );
  async function postComment() {
    if (!comment.trim()) return;
    await actions.comment.mutateAsync({
      uuid,
      bodyHtml: `<p>${escapeHtml(comment.trim())}</p>`,
      parentUuid: replyTo
    });
    setComment("");
    setReplyTo(null);
    await comments.refetch();
  }
  async function share() {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Discussion link copied");
  }
  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-5xl pb-72 pt-6 lg:w-[calc(100%-3rem)] lg:pb-72 lg:pt-8">
      <div className="flex items-center justify-between pb-6">
        <Button variant="ghost" onClick={() => window.location.assign("/app/neot/ideas")}>
          <ArrowLeftIcon />
          All ideas
        </Button>
        <Button
          variant="outline"
          onClick={() => window.location.assign(`/app/neot/ideas/${uuid}/edit`)}
        >
          <PencilIcon />
          Edit
        </Button>
      </div>
      <article>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold tabular-nums text-foreground">
            #{idea.referenceNumber}
          </span>
          <span
            className="rounded-full px-2.5 py-1 font-medium"
            style={{ backgroundColor: `${idea.categoryColor}1f`, color: idea.categoryColor }}
          >
            {idea.category}
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium capitalize"
            style={{ borderColor: `${idea.statusColor}66`, color: idea.statusColor }}
          >
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full"
              style={{ backgroundColor: idea.statusColor }}
            />
            {idea.status.replaceAll("-", " ")}
          </span>
          <span className="text-muted-foreground">· {displayName(idea.author)}</span>
        </div>
        <h1 className="max-w-4xl pt-4 text-4xl font-semibold tracking-tight">{idea.title}</h1>
        <p className="max-w-3xl pt-3 text-lg leading-8 text-muted-foreground">{idea.excerpt}</p>
        <div className="flex flex-wrap gap-2 pt-5">
          {idea.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-muted px-2 py-1 text-sm">
              #{tag}
            </span>
          ))}
          {projectNames.map((name) => (
            <span key={name} className="rounded-md border px-2 py-1 text-sm">
              {name}
            </span>
          ))}
        </div>
        {assignees.length ? (
          <div className="flex flex-wrap items-center gap-2 pt-4 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
              <UserRoundIcon className="size-4" />
              Assigned to
            </span>
            {assignees.map((name, index) => (
              <span
                className="rounded-full border bg-muted/20 px-2.5 py-1"
                key={`${name}-${index}`}
              >
                {name}
              </span>
            ))}
          </div>
        ) : null}
        <div
          className="prose prose-neutral mt-9 max-w-none border-t pt-8 dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: safeHtml(idea.contentHtml) }}
        />
        {idea.attachments.length ? (
          <div className="grid gap-3 pt-8 sm:grid-cols-2 lg:grid-cols-3">
            {idea.attachments.map((attachment) => (
              <figure key={attachment.uuid} className="overflow-hidden rounded-lg border">
                <img
                  className="aspect-video w-full object-cover"
                  src={attachment.dataUrl}
                  alt={attachment.name}
                />
                <figcaption className="truncate px-3 py-2 text-sm">{attachment.name}</figcaption>
              </figure>
            ))}
          </div>
        ) : null}
        {idea.poll ? (
          <section className="mt-8 max-w-2xl rounded-xl bg-muted/50 p-5">
            <h2 className="text-lg font-semibold">{idea.poll.question}</h2>
            <div className="space-y-2 pt-4">
              {idea.poll.options.map((option) => {
                const total = idea.poll!.options.reduce((sum, item) => sum + item.votes, 0);
                const percent = total ? Math.round((option.votes / total) * 100) : 0;
                return (
                  <button
                    key={option.id}
                    className="relative flex w-full overflow-hidden rounded-md border bg-background px-3 py-2 text-left"
                    onClick={() => void actions.vote.mutateAsync({ uuid, optionId: option.id })}
                  >
                    <span
                      className="absolute inset-y-0 left-0 bg-primary/10"
                      style={{ width: `${percent}%` }}
                    />
                    <span className="relative flex w-full justify-between">
                      <span>{option.label}</span>
                      <span>
                        {option.votes} · {percent}%
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
        <div className="mt-8 flex gap-2 border-y py-3">
          <Button
            variant="ghost"
            onClick={() => void actions.reactIdea.mutateAsync({ uuid, vote: "up" })}
          >
            <ThumbsUpIcon />
            {idea.likes || ""}
            <span className="sr-only">Thumbs up</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => void actions.reactIdea.mutateAsync({ uuid, vote: "down" })}
          >
            <ThumbsDownIcon />
            {idea.dislikes || ""}
            <span className="sr-only">Thumbs down</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              document.getElementById("discussion")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <MessageCircleIcon />
            {idea.commentCount + idea.replyCount || ""} Discuss
          </Button>
          <Button variant="ghost" onClick={() => void share()}>
            <Share2Icon />
            Share
          </Button>
        </div>
      </article>
      <section id="discussion" className="pt-10">
        <h2 className="text-xl font-semibold">Discussion</h2>
        <p className="pt-1 text-sm text-muted-foreground">
          Build on the proposal, ask questions, and reply to a specific point.
        </p>
        <div className="space-y-4 pt-6">
          {thread(comments.data ?? []).map(({ comment: entry, replies }) => (
            <div key={entry.uuid} className="pb-4">
              <CommentThread
                comment={entry}
                replies={replies}
                onReact={(id, vote) =>
                  void actions.reactComment
                    .mutateAsync({ uuid: id, vote })
                    .then(() => comments.refetch())
                }
                onReply={setReplyTo}
              />
              <div aria-hidden="true" className="mt-5 w-4/5 border-t border-border" />
            </div>
          ))}
        </div>
        <div className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur md:left-[calc(50%+var(--sidebar-width)/2)] md:w-[calc(100%-var(--sidebar-width)-3rem)]">
          <div className="flex items-center justify-between pb-2">
            <strong>{replyTo ? "Write a reply" : "Join the discussion"}</strong>
            {replyTo ? (
              <button className="text-sm text-muted-foreground" onClick={() => setReplyTo(null)}>
                Cancel reply
              </button>
            ) : null}
          </div>
          <div className="relative w-full">
            <Textarea
              className="min-h-24 resize-none border-border/90 pb-12 pr-36 shadow-none"
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Share a constructive response…"
            />
            <Button
              className="absolute bottom-2 right-2 bg-neutral-950 px-5 text-white shadow-sm hover:bg-neutral-800"
              disabled={!comment.trim() || actions.comment.isPending}
              onClick={() => void postComment()}
            >
              Post {replyTo ? "reply" : "comment"}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function CommentThread({
  comment,
  replies,
  onReact,
  onReply,
  isReply = false
}: {
  comment: IdeaComment;
  replies: IdeaComment[];
  onReact: (uuid: string, vote: "down" | "up") => void;
  onReply: (uuid: string) => void;
  isReply?: boolean;
}) {
  return (
    <div className={isReply ? "ml-6 border-l pl-6 sm:ml-10 sm:pl-10" : ""}>
      <div className="flex items-center justify-end gap-2 text-right text-sm">
        <strong>{displayName(comment.author)}</strong>
        <span
          className="text-muted-foreground"
          title={new Date(comment.createdAt).toLocaleString()}
        >
          {timeAgo(comment.createdAt)}
        </span>
      </div>
      <div
        className="prose prose-sm max-w-none pt-2 dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: safeHtml(comment.bodyHtml) }}
      />
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          aria-label="Thumbs up"
          onClick={() => onReact(comment.uuid, "up")}
        >
          <ThumbsUpIcon />
          {comment.likes}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label="Thumbs down"
          onClick={() => onReact(comment.uuid, "down")}
        >
          <ThumbsDownIcon />
          {comment.dislikes}
        </Button>
        {!isReply ? (
          <Button size="sm" variant="ghost" onClick={() => onReply(comment.uuid)}>
            <ReplyIcon />
            Reply
          </Button>
        ) : null}
      </div>
      {replies.length ? (
        <div className="space-y-4 pt-4">
          {replies.map((reply) => (
            <CommentThread
              key={reply.uuid}
              comment={reply}
              replies={[]}
              isReply
              onReact={onReact}
              onReply={onReply}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
function thread(comments: IdeaComment[]) {
  const roots = comments.filter((item) => !item.parentUuid);
  return roots.map((comment) => ({
    comment,
    replies: comments.filter((item) => item.parentUuid === comment.uuid)
  }));
}
function displayName(author: string) {
  const name = author
    .trim()
    .split("@", 1)[0]
    ?.replace(/[._-]+/g, " ")
    .trim();
  if (!name) return "Unknown";
  return name.replace(/\b\w/g, (character) => character.toUpperCase());
}
function timeAgo(createdAt: string) {
  const timestamp = ideaTimestamp(createdAt);
  if (timestamp === null) return "now";
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1_000));
  if (elapsedSeconds < 2) return "now";
  if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 30) return `${elapsedDays}d ago`;
  const elapsedMonths = Math.floor(elapsedDays / 30);
  if (elapsedMonths < 12) return `${elapsedMonths}mo ago`;
  return `${Math.floor(elapsedMonths / 12)}y ago`;
}
function ideaTimestamp(createdAt: string) {
  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) return null;
  if (timestamp <= Date.now() + 60_000 || !createdAt.endsWith("Z")) return timestamp;

  // MariaDB DATETIME values can arrive with a UTC suffix even though they contain local wall time.
  return timestamp + new Date().getTimezoneOffset() * 60_000;
}
function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function safeHtml(value: string) {
  return DOMPurify.sanitize(value, { USE_PROFILES: { html: true } });
}
