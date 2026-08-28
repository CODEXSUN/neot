import { ArrowRightIcon, BotIcon, CheckIcon, TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { WorkspaceStatusBadge } from "@neot/ui/workspace/status";
import { useLearningSnapshot } from "../learning/learning.hooks";
import type {
  LearningAttempt,
  LearningClass,
  LearningLesson,
  LearningTest
} from "../learning/learning.types";
import { DashboardDock } from "./dashboard.dock";
import { quoteForDate } from "./dashboard.quotes";

export function DashboardWorkspace() {
  const learningQuery = useLearningSnapshot();
  const learning = learningQuery.data;
  const classes = (learning?.classes ?? []).filter((record) => record.status === "active");
  const lessons = (learning?.lessons ?? []).filter((record) => record.status === "published");
  const questions = learning?.questions ?? [];
  const tests = (learning?.tests ?? []).filter((record) => record.status === "published");
  const attention = questions.filter((record) => record.status !== "answered").length;
  const featuredClasses = classes.slice(0, 3);
  const focus = lessons.slice(0, 3);
  const activity = [...(learning?.attempts ?? [])]
    .sort((left, right) => right.completedAt.localeCompare(left.completedAt))
    .slice(0, 4);
  const dailyQuote = quoteForDate(new Date());

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
      <header className="flex min-h-52 flex-col items-center justify-center border-b px-4 py-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Good morning, Sundar</h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          &ldquo;{dailyQuote}&rdquo;
        </p>
      </header>

      {learningQuery.error ? (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {learningQuery.error.message}
        </div>
      ) : null}

      <section className="grid grid-cols-2 border-b py-6 sm:grid-cols-4">
        <Metric href="/app/neot/classes" label="Active classes" value={classes.length} />
        <Metric href="/app/neot/lessons" label="Lessons" value={lessons.length} />
        <Metric href="/app/neot/questions" label="Open questions" value={attention} />
        <Metric href="/app/neot/courses" label="Courses" value={learning?.courses.length ?? 0} />
      </section>

      <section className="flex justify-center px-4 pt-16" aria-label="Quick navigation">
        <DashboardDock />
      </section>

      <div className="grid gap-x-12 gap-y-9 pb-8 pt-16 lg:grid-cols-2">
        <Section href="/app/neot/lessons" title="Today's focus">
          <LessonList empty="No lesson needs your focus today." lessons={focus} />
        </Section>

        <Section href="/app/neot/courses" title="Learning health">
          <div className="divide-y rounded-lg border bg-card">
            <HealthRow
              good={!attention}
              href="/app/neot/questions"
              label="Student questions"
              value={attention ? `${attention} need an answer` : "All answered"}
            />
            <HealthRow
              good={Boolean(lessons.length)}
              href="/app/neot/lessons"
              label="Lesson plan"
              value={lessons.length ? `${lessons.length} lessons available` : "Needs planning"}
            />
            <HealthRow
              good={Boolean(tests.length)}
              href="/app/neot/tests"
              label="Tests and quizzes"
              value={tests.length ? `${tests.length} available` : "Needs preparation"}
            />
          </div>
        </Section>

        <Section href="/app/neot/classes" title="Classes">
          <div className="divide-y rounded-lg border bg-card">
            {featuredClasses.length ? (
              featuredClasses.map((learningClass) => (
                <ClassRow key={learningClass.id} learningClass={learningClass} />
              ))
            ) : (
              <Empty text="No active classes." />
            )}
          </div>
        </Section>

        <Section href="/app/neot/my-work?view=activity" title="Recent actions">
          <div className="divide-y rounded-lg border bg-card">
            {activity.length ? (
              activity.map((attempt) => (
                <AttemptRow
                  attempt={attempt}
                  key={attempt.id}
                  test={tests.find((item) => item.uuid === attempt.testUuid)}
                />
              ))
            ) : (
              <Empty text="No recent actions." />
            )}
          </div>
        </Section>
      </div>

      <section className="mb-4 rounded-xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <BotIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Learning and welfare assistant</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {attention
                ? `I found ${attention} student questions that need attention.`
                : "Your learning space has no unanswered questions."}
            </p>
            <div className="mt-3 flex gap-4 text-sm font-medium text-primary">
              <a className="hover:underline" href="/app/neot/my-work">
                Review learning
              </a>
              <a
                className="inline-flex items-center gap-1 hover:underline"
                href="/app/neot/agent-ide"
              >
                Ask AI <ArrowRightIcon className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <a
      className="group border-r px-4 py-2 transition-colors last:border-r-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      href={href}
    >
      <strong className="text-2xl font-semibold">{value}</strong>
      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
        {label} <ArrowRightIcon className="size-3" />
      </span>
    </a>
  );
}
function Section({ children, href, title }: { children: ReactNode; href: string; title: string }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        <a className="text-xs font-medium text-primary hover:underline" href={href}>
          View all
        </a>
      </div>
      {children}
    </section>
  );
}
function LessonList({ empty, lessons }: { empty: string; lessons: LearningLesson[] }) {
  if (!lessons.length) return <Empty text={empty} />;
  return (
    <div className="divide-y rounded-lg border bg-card">
      {lessons.map((lesson) => (
        <a
          key={lesson.uuid}
          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
          href={`/app/neot/lessons?lesson=${encodeURIComponent(lesson.uuid)}`}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{lesson.title}</span>
            <span className="text-xs text-muted-foreground">{label(lesson.status)}</span>
          </span>
          <ArrowRightIcon className="size-4 text-muted-foreground" />
        </a>
      ))}
    </div>
  );
}
function HealthRow({
  good,
  href,
  label: rowLabel,
  value
}: {
  good: boolean;
  href: string;
  label: string;
  value: string;
}) {
  const Icon = good ? CheckIcon : TriangleAlertIcon;
  return (
    <a className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40" href={href}>
      <span className="flex-1 text-sm">{rowLabel}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
      <Icon className={`size-4 ${good ? "text-emerald-600" : "text-amber-600"}`} />
    </a>
  );
}
function ClassRow({ learningClass }: { learningClass: LearningClass }) {
  return (
    <a
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
      href={`/app/neot/classes?class=${encodeURIComponent(learningClass.uuid)}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{learningClass.title}</span>
        <span className="text-xs text-muted-foreground">
          {learningClass.masterEmail || "Master not assigned"}
        </span>
      </span>
      <WorkspaceStatusBadge label={label(learningClass.status)} tone="success" />
    </a>
  );
}
function AttemptRow({
  attempt,
  test
}: {
  attempt: LearningAttempt;
  test: LearningTest | undefined;
}) {
  return (
    <a className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40" href="/app/neot/tests">
      <CheckIcon className="size-4 text-emerald-600" />
      <span className="min-w-0 flex-1 truncate text-sm">
        {test?.title ?? "Quiz attempt"} · {attempt.percentage}%
      </span>
      <span className="text-xs text-muted-foreground">{formatTime(attempt.completedAt)}</span>
      <ArrowRightIcon className="size-3.5 text-muted-foreground" />
    </a>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
function label(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? ""
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(date);
}
