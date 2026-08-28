import { useState, type FormEvent } from "react";
import { MessageCircleIcon, ReplyIcon, SendIcon } from "lucide-react";
import { Button } from "@neot/ui/components/button";
import { useLessonDiscussion } from "./learning.hooks";
import type { LearningDiscussionPost } from "./learning.types";

export function LessonDiscussion({ lessonUuid }: { lessonUuid: string }) {
  const discussion = useLessonDiscussion(lessonUuid);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const posts = discussion.query.data ?? [];
  const roots = posts.filter((post) => !post.parentUuid);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    await discussion.add.mutateAsync({ body: body.trim(), parentUuid: replyTo });
    setBody("");
    setReplyTo(null);
  };

  return (
    <section className="max-w-4xl border-t pt-8" id="discussion">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-muted text-primary">
          <MessageCircleIcon className="size-4" />
        </span>
        <div>
          <h3 className="text-xl font-semibold">Discussion</h3>
          <p className="text-sm text-muted-foreground">This lesson is its own forum topic.</p>
        </div>
      </div>
      <div className="grid gap-5 py-6">
        {roots.map((post) => (
          <DiscussionThread
            key={post.uuid}
            onReply={setReplyTo}
            post={post}
            replies={posts.filter((reply) => reply.parentUuid === post.uuid)}
          />
        ))}
        {!discussion.query.isLoading && !roots.length ? (
          <p className="rounded-xl bg-muted/40 p-5 text-sm text-muted-foreground">
            No discussion yet. Ask a question or share what you learned.
          </p>
        ) : null}
      </div>
      <form className="rounded-2xl border bg-card p-4" onSubmit={submit}>
        <div className="flex items-center justify-between gap-4 pb-3 text-sm">
          <strong>{replyTo ? "Write a reply" : "Join the discussion"}</strong>
          {replyTo ? (
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setReplyTo(null)}
              type="button"
            >
              Cancel reply
            </button>
          ) : null}
        </div>
        <textarea
          className="min-h-24 w-full resize-y rounded-xl border bg-background px-3 py-3 text-sm leading-6"
          maxLength={10_000}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a constructive comment or question…"
          value={body}
        />
        <div className="flex justify-end pt-3">
          <Button disabled={!body.trim() || discussion.add.isPending} type="submit">
            <SendIcon /> {replyTo ? "Post reply" : "Post comment"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function DiscussionThread({
  onReply,
  post,
  replies
}: {
  onReply: (uuid: string) => void;
  post: LearningDiscussionPost;
  replies: LearningDiscussionPost[];
}) {
  return (
    <article className="border-b pb-5">
      <p className="text-sm font-semibold">{post.author}</p>
      <p className="pt-2 text-sm leading-6 whitespace-pre-wrap">{post.body}</p>
      <Button className="mt-2" onClick={() => onReply(post.uuid)} size="sm" variant="ghost">
        <ReplyIcon /> Reply
      </Button>
      {replies.map((reply) => (
        <div className="ml-6 mt-4 border-l pl-5 sm:ml-10" key={reply.uuid}>
          <p className="text-sm font-semibold">{reply.author}</p>
          <p className="pt-2 text-sm leading-6 whitespace-pre-wrap">{reply.body}</p>
        </div>
      ))}
    </article>
  );
}
