import { useState, type FormEvent } from "react";
import { CircleHelpIcon, MessageCircleReplyIcon, SendIcon } from "lucide-react";
import { Button } from "@neot/ui/components/button";
import type { LearningSnapshot } from "./learning.types";

export function QAndAWorkspace({
  onAnswer,
  snapshot
}: {
  onAnswer: (questionUuid: string, answerText: string) => Promise<unknown>;
  snapshot: LearningSnapshot;
}) {
  return (
    <section className="grid gap-5 py-7">
      {snapshot.questions.map((question) => (
        <QuestionCard
          key={question.uuid}
          onAnswer={onAnswer}
          questionUuid={question.uuid}
          snapshot={snapshot}
        />
      ))}
      {!snapshot.questions.length ? (
        <p className="border-b py-12 text-sm text-muted-foreground">No questions yet.</p>
      ) : null}
    </section>
  );
}

function QuestionCard({
  onAnswer,
  questionUuid,
  snapshot
}: {
  onAnswer: (questionUuid: string, answerText: string) => Promise<unknown>;
  questionUuid: string;
  snapshot: LearningSnapshot;
}) {
  const [answering, setAnswering] = useState(false);
  const [answer, setAnswer] = useState("");
  const question = snapshot.questions.find((item) => item.uuid === questionUuid)!;
  const lesson = snapshot.lessons.find((item) => item.uuid === question.lessonUuid);
  const answers = snapshot.answers.filter((item) => item.questionUuid === question.uuid);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!answer.trim()) return;
    await onAnswer(question.uuid, answer.trim());
    setAnswer("");
    setAnswering(false);
  };
  return (
    <article className="rounded-2xl border bg-card p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-900">
          <CircleHelpIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            {lesson?.title ?? "Lesson"} · Asked by {question.askedBy}
          </p>
          <h2 className="pt-2 text-lg font-semibold leading-7">{question.questionText}</h2>
        </div>
      </div>
      <div className="ml-0 grid gap-3 pt-5 sm:ml-14">
        {answers.map((entry) => (
          <div className="rounded-xl bg-muted/45 p-4" key={entry.uuid}>
            <p className="text-sm leading-6 whitespace-pre-wrap">{entry.answerText}</p>
            <p className="pt-2 text-xs text-muted-foreground">Answered by {entry.answeredBy}</p>
          </div>
        ))}
        {!answers.length ? <p className="text-sm text-muted-foreground">No answers yet.</p> : null}
        {answering ? (
          <form className="grid gap-3" onSubmit={submit}>
            <textarea
              className="min-h-24 rounded-xl border bg-background px-3 py-3 text-sm"
              maxLength={8000}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Write a clear, helpful answer…"
              value={answer}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setAnswering(false)} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={!answer.trim()} type="submit">
                <SendIcon /> Post answer
              </Button>
            </div>
          </form>
        ) : (
          <div>
            <Button className="bg-muted/50" onClick={() => setAnswering(true)} variant="outline">
              <MessageCircleReplyIcon /> Reply
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}
