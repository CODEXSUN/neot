import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CircleHelpIcon,
  ClipboardCheckIcon,
  Layers3Icon
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@neot/ui/components/button";
import { LessonDiscussion } from "./learning.discussion";
import type { LearningLesson, LearningSnapshot } from "./learning.types";

export function SubjectCards({ snapshot }: { snapshot: LearningSnapshot }) {
  return (
    <CardGrid empty="No subjects yet.">
      {snapshot.subjects.map((subject) => {
        const course = snapshot.courses.find((item) => item.uuid === subject.courseUuid);
        const lessonCount = snapshot.lessons.filter(
          (lesson) => lesson.subjectUuid === subject.uuid
        ).length;
        return (
          <a
            className="group flex min-h-48 flex-col justify-between rounded-2xl border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href={`/app/neot/lessons?course=${subject.courseUuid}&subject=${subject.uuid}`}
            key={subject.uuid}
          >
            <div>
              <span className="grid size-10 place-items-center rounded-xl bg-sky-100 text-sky-900">
                <Layers3Icon className="size-5" />
              </span>
              <h2 className="pt-5 text-lg font-semibold text-primary">{subject.title}</h2>
              <p className="line-clamp-2 pt-2 text-sm leading-6 text-muted-foreground">
                {subject.description || "Explore the ideas and lessons in this subject."}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 border-t pt-4 text-sm">
              <span className="text-muted-foreground">
                {course?.title ?? "Course"} · {lessonCount}{" "}
                {lessonCount === 1 ? "lesson" : "lessons"}
              </span>
              <ArrowRightIcon className="size-4 shrink-0 transition group-hover:translate-x-1" />
            </div>
          </a>
        );
      })}
    </CardGrid>
  );
}

export function LessonCards({ snapshot }: { snapshot: LearningSnapshot }) {
  const selectedLesson = selectedLessonFrom(snapshot);
  if (selectedLesson) return <LessonShow lesson={selectedLesson} snapshot={snapshot} />;
  if (!snapshot.lessons.length)
    return <p className="border-b py-12 text-sm text-muted-foreground">No lessons yet.</p>;
  return (
    <section className="grid gap-3 py-7">
      {snapshot.lessons.map((lesson) => {
        const subject = snapshot.subjects.find((item) => item.uuid === lesson.subjectUuid);
        return (
          <a
            className="group grid w-full grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-5 rounded-2xl border bg-card p-5 transition hover:border-primary/40 hover:bg-muted/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
            href={lessonHref(lesson)}
            key={lesson.uuid}
          >
            <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-violet-100 text-xl font-semibold text-violet-900">
              {lesson.position + 1}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
                <span>{subject?.title ?? "Subject"}</span>
                <span aria-hidden="true">·</span>
                <span>{lesson.status}</span>
              </div>
              <h2 className="pt-2 text-lg font-semibold text-primary">{lesson.title}</h2>
              <p className="line-clamp-2 pt-1 text-sm leading-6 text-muted-foreground">
                {lesson.content || "Open this lesson to begin learning."}
              </p>
            </div>
            <ArrowRightIcon className="size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
          </a>
        );
      })}
    </section>
  );
}

function LessonShow({ lesson, snapshot }: { lesson: LearningLesson; snapshot: LearningSnapshot }) {
  const subject = snapshot.subjects.find((item) => item.uuid === lesson.subjectUuid);
  const course = snapshot.courses.find((item) => item.uuid === subject?.courseUuid);
  const backHref = `/app/neot/lessons?course=${subject?.courseUuid ?? ""}&subject=${lesson.subjectUuid}`;
  const lessonIndex = snapshot.lessons.findIndex((item) => item.uuid === lesson.uuid);
  const previousLesson = lessonIndex > 0 ? snapshot.lessons[lessonIndex - 1] : undefined;
  const nextLesson =
    lessonIndex < snapshot.lessons.length - 1 ? snapshot.lessons[lessonIndex + 1] : undefined;
  const context = `course=${subject?.courseUuid ?? ""}&subject=${lesson.subjectUuid}&lesson=${lesson.uuid}`;
  return (
    <article className="py-7">
      <Button asChild variant="ghost">
        <a href={backHref}>
          <ArrowLeftIcon /> All lessons
        </a>
      </Button>
      <div className="pt-7">
        <p className="text-sm font-medium text-primary">{course?.title ?? "Course"}</p>
        <p className="pt-2 text-sm text-muted-foreground">{subject?.title ?? "Subject"}</p>
        <p className="pt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Lesson {lesson.position + 1}
        </p>
        <h2 className="max-w-3xl pt-3 text-3xl font-semibold tracking-tight">{lesson.title}</h2>
        <div className="mt-7 max-w-4xl border-y py-8 text-base leading-8 text-foreground/90 whitespace-pre-wrap">
          {lesson.content || "Lesson content has not been added yet."}
        </div>
        <p className="max-w-4xl pt-4 text-sm text-muted-foreground">
          Written by{" "}
          <strong className="font-medium text-foreground">
            {lesson.author || course?.author || "NEOT Learning"}
          </strong>
        </p>
        <footer className="flex max-w-4xl flex-wrap items-center justify-between gap-5 pt-6">
          <div className="flex items-center gap-2">
            {previousLesson ? (
              <Button asChild variant="outline">
                <a href={lessonHref(previousLesson)}>
                  <ArrowLeftIcon /> Previous
                </a>
              </Button>
            ) : null}
            {nextLesson ? (
              <Button asChild variant="outline">
                <a href={lessonHref(nextLesson)}>
                  Next <ArrowRightIcon />
                </a>
              </Button>
            ) : null}
          </div>
          <nav aria-label="Lesson resources" className="flex flex-wrap items-center gap-2">
            <ResourceLink
              href={`/app/neot/tests?${context}`}
              icon={ClipboardCheckIcon}
              label="Tests"
            />
            <ResourceLink
              href={`/app/neot/questions?${context}`}
              icon={CircleHelpIcon}
              label="Q & A"
            />
          </nav>
        </footer>
        <div className="pt-10">
          <LessonDiscussion lessonUuid={lesson.uuid} />
        </div>
      </div>
    </article>
  );
}

function ResourceLink({
  href,
  icon: Icon,
  label
}: {
  href: string;
  icon: typeof BookOpenIcon;
  label: string;
}) {
  return (
    <Button asChild className="bg-muted/50 text-foreground hover:bg-muted" variant="outline">
      <a href={href}>
        <Icon /> {label}
      </a>
    </Button>
  );
}

function CardGrid({ children, empty }: { children: ReactNode; empty: string }) {
  const items = Array.isArray(children) ? children : [children];
  if (!items.some(Boolean))
    return <p className="border-b py-12 text-sm text-muted-foreground">{empty}</p>;
  return <section className="grid gap-5 py-7 sm:grid-cols-2 xl:grid-cols-3">{children}</section>;
}

function selectedLessonFrom(snapshot: LearningSnapshot) {
  if (typeof window === "undefined") return undefined;
  const lessonUuid = new URLSearchParams(window.location.search).get("lesson");
  return snapshot.lessons.find((lesson) => lesson.uuid === lessonUuid);
}

function lessonHref(lesson: LearningLesson) {
  const parameters = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search
  );
  parameters.set("subject", lesson.subjectUuid);
  parameters.set("lesson", lesson.uuid);
  return `/app/neot/lessons?${parameters.toString()}`;
}
