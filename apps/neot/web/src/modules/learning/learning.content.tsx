import { useState, type ReactNode } from "react";
import { ArrowLeftIcon, ChevronRightIcon, UsersIcon } from "lucide-react";
import { Button } from "@neot/ui/components/button";
import type { LearningSection } from "./learning.config";
import type { LearningSnapshot } from "./learning.types";

export function CourseDrillDown({ snapshot }: { snapshot: LearningSnapshot }) {
  const [courseUuid, setCourseUuid] = useState("");
  const [subjectUuid, setSubjectUuid] = useState("");
  const [lessonUuid, setLessonUuid] = useState("");
  const [questionUuid, setQuestionUuid] = useState("");
  const course = snapshot.courses.find((item) => item.uuid === courseUuid);
  const subject = snapshot.subjects.find((item) => item.uuid === subjectUuid);
  const lesson = snapshot.lessons.find((item) => item.uuid === lessonUuid);
  const question = snapshot.questions.find((item) => item.uuid === questionUuid);
  const back = () =>
    question
      ? setQuestionUuid("")
      : lesson
        ? setLessonUuid("")
        : subject
          ? setSubjectUuid("")
          : setCourseUuid("");
  const title =
    question?.questionText ?? lesson?.title ?? subject?.title ?? course?.title ?? "All courses";
  return (
    <section className="py-8">
      <div className="flex min-h-10 items-center gap-3 border-b pb-5">
        {course ? (
          <Button aria-label="Go back one level" onClick={back} size="icon" variant="ghost">
            <ArrowLeftIcon />
          </Button>
        ) : null}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {levelLabel({ course, lesson, question, subject })}
          </p>
          <h2 className="pt-1 text-xl font-semibold">{title}</h2>
        </div>
      </div>
      {!course ? (
        <RelaxedRows empty="No courses yet.">
          {snapshot.courses.map((item) => (
            <DrillRow
              key={item.uuid}
              title={item.title}
              context={`${item.code} · ${snapshot.subjects.filter((subjectItem) => subjectItem.courseUuid === item.uuid).length} subjects`}
              description={item.description}
              onOpen={() => setCourseUuid(item.uuid)}
            />
          ))}
        </RelaxedRows>
      ) : null}
      {course && !subject ? (
        <>
          <GroupTitle
            title="Subjects"
            detail={`${snapshot.classes.filter((item) => item.courseUuid === course.uuid).length} connected classes`}
          />
          <RelaxedRows empty="No subjects in this course yet.">
            {snapshot.subjects
              .filter((item) => item.courseUuid === course.uuid)
              .map((item) => (
                <DrillRow
                  key={item.uuid}
                  title={item.title}
                  context={`${snapshot.lessons.filter((lessonItem) => lessonItem.subjectUuid === item.uuid).length} lessons`}
                  description={item.description}
                  onOpen={() => setSubjectUuid(item.uuid)}
                />
              ))}
          </RelaxedRows>
        </>
      ) : null}
      {subject && !lesson ? (
        <>
          <GroupTitle title="Lessons" detail={course?.title ?? "Course"} />
          <RelaxedRows empty="No lessons in this subject yet.">
            {snapshot.lessons
              .filter((item) => item.subjectUuid === subject.uuid)
              .map((item) => (
                <DrillRow
                  key={item.uuid}
                  title={item.title}
                  context={item.status}
                  description={item.content}
                  onOpen={() => setLessonUuid(item.uuid)}
                />
              ))}
          </RelaxedRows>
        </>
      ) : null}
      {lesson && !question ? (
        <>
          <GroupTitle
            title="Questions"
            detail={`${snapshot.tests.filter((item) => item.lessonUuid === lesson.uuid).length} related tests`}
          />
          <RelaxedRows empty="No questions in this lesson yet.">
            {snapshot.questions
              .filter((item) => item.lessonUuid === lesson.uuid)
              .map((item) => (
                <DrillRow
                  key={item.uuid}
                  title={item.questionText}
                  context={`${item.status} · asked by ${item.askedBy}`}
                  onOpen={() => setQuestionUuid(item.uuid)}
                />
              ))}
          </RelaxedRows>
        </>
      ) : null}
      {question ? (
        <>
          <GroupTitle title="Answers" detail={question.status} />
          <RelaxedRows empty="This question has no answers yet.">
            {snapshot.answers
              .filter((item) => item.questionUuid === question.uuid)
              .map((item) => (
                <StaticRow
                  key={item.uuid}
                  title={item.answerText}
                  context={`Answered by ${item.answeredBy}`}
                />
              ))}
          </RelaxedRows>
        </>
      ) : null}
    </section>
  );
}

export function LearningSectionRows({
  section,
  snapshot
}: {
  section: Exclude<LearningSection, "courses" | "classes" | "tests" | "performance">;
  snapshot: LearningSnapshot;
}) {
  const rows = sectionRows(section, snapshot);
  return (
    <RelaxedRows empty={`No ${section} yet.`}>
      {rows.map((row) => (
        <StaticRow
          context={row.context}
          description={row.description}
          key={row.id}
          title={row.title}
        />
      ))}
    </RelaxedRows>
  );
}

export function ClassesAndPeople({ snapshot }: { snapshot: LearningSnapshot }) {
  return (
    <div className="py-8">
      <RelaxedRows empty="No classes yet.">
        {snapshot.classes.map((item) => {
          const course = snapshot.courses.find((courseItem) => courseItem.uuid === item.courseUuid);
          const attendance = snapshot.enrollments.filter(
            (entry) => entry.classUuid === item.uuid && entry.role === "student"
          ).length;
          return (
            <StaticRow
              key={item.uuid}
              title={item.title}
              context={`${course?.title ?? "Course"} · ${item.scheduleText || "Schedule not set"}`}
              description={`${item.masterEmail || "Master not connected"} · ${attendance} attending students`}
              icon={<UsersIcon size={18} />}
            />
          );
        })}
      </RelaxedRows>
      <GroupTitle title="Course connections" detail={`${snapshot.enrollments.length} people`} />
      <RelaxedRows empty="No masters or students connected yet.">
        {snapshot.enrollments.map((item) => (
          <StaticRow
            key={item.uuid}
            title={item.memberName || item.memberEmail}
            context={`${item.role} · ${snapshot.courses.find((course) => course.uuid === item.courseUuid)?.title ?? "Course"}`}
            description={
              item.classUuid
                ? `Attends ${snapshot.classes.find((classItem) => classItem.uuid === item.classUuid)?.title ?? "class"}`
                : "Course enrollment"
            }
          />
        ))}
      </RelaxedRows>
    </div>
  );
}

export function PerformanceRows({ snapshot }: { snapshot: LearningSnapshot }) {
  return (
    <section className="py-8">
      <div className="grid grid-cols-[minmax(0,1fr)_90px_120px_100px] gap-4 border-b pb-3 text-sm font-medium text-muted-foreground">
        <span>Student</span>
        <span>Attempts</span>
        <span>Average</span>
        <span>Best</span>
      </div>
      {snapshot.performance.map((item) => (
        <div
          className="grid grid-cols-[minmax(0,1fr)_90px_120px_100px] items-center gap-4 border-b py-5"
          key={item.studentEmail}
        >
          <strong className="truncate font-medium">{item.studentEmail}</strong>
          <span>{item.attempts}</span>
          <span>{item.averagePercentage}%</span>
          <strong>{item.bestPercentage}%</strong>
        </div>
      ))}
      {!snapshot.performance.length ? (
        <p className="border-b py-12 text-sm text-muted-foreground">
          Performance appears after students complete their first quiz.
        </p>
      ) : null}
    </section>
  );
}

function sectionRows(section: string, snapshot: LearningSnapshot) {
  if (section === "subjects")
    return snapshot.subjects.map((item) => ({
      context:
        snapshot.courses.find((parent) => parent.uuid === item.courseUuid)?.title ?? "Course",
      description: item.description,
      id: item.uuid,
      title: item.title
    }));
  if (section === "lessons")
    return snapshot.lessons.map((item) => ({
      context:
        snapshot.subjects.find((parent) => parent.uuid === item.subjectUuid)?.title ?? "Subject",
      description: item.content,
      id: item.uuid,
      title: item.title
    }));
  if (section === "questions")
    return snapshot.questions.map((item) => ({
      context: `${item.status} · ${snapshot.lessons.find((parent) => parent.uuid === item.lessonUuid)?.title ?? "Lesson"}`,
      description: `Asked by ${item.askedBy}`,
      id: item.uuid,
      title: item.questionText
    }));
  return snapshot.answers.map((item) => ({
    context: `Answered by ${item.answeredBy}`,
    description:
      snapshot.questions.find((parent) => parent.uuid === item.questionUuid)?.questionText ??
      "Question",
    id: item.uuid,
    title: item.answerText
  }));
}

function RelaxedRows({ children, empty }: { children: ReactNode; empty: string }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <div className="py-3">
      {items.length && items.some(Boolean) ? (
        children
      ) : (
        <p className="border-b py-12 text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
function DrillRow({
  context,
  description,
  onOpen,
  title
}: {
  context: string;
  description?: string;
  onOpen: () => void;
  title: string;
}) {
  return (
    <button
      className="group flex w-full items-center gap-5 border-b py-6 text-left transition-colors hover:border-primary"
      onClick={onOpen}
      type="button"
    >
      <span className="min-w-0 flex-1">
        <strong className="block text-base font-semibold">{title}</strong>
        {description ? (
          <span className="block max-w-3xl pt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </span>
        ) : null}
        <span className="block pt-2 text-xs text-muted-foreground">{context}</span>
      </span>
      <ChevronRightIcon
        className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
        size={20}
      />
    </button>
  );
}
function StaticRow({
  context,
  description,
  icon,
  title
}: {
  context: string;
  description?: string;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <article className="flex items-start gap-4 border-b py-6">
      {icon ? <span className="mt-1 shrink-0 text-muted-foreground">{icon}</span> : null}
      <div className="min-w-0">
        <h3 className="text-base font-semibold">{title}</h3>
        {description ? (
          <p className="max-w-3xl pt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
        <p className="pt-2 text-xs text-muted-foreground">{context}</p>
      </div>
    </article>
  );
}
function GroupTitle({ detail, title }: { detail: string; title: string }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b pt-8 pb-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em]">{title}</h3>
      <span className="text-sm text-muted-foreground">{detail}</span>
    </div>
  );
}
function levelLabel({
  course,
  lesson,
  question,
  subject
}: {
  course?: unknown;
  lesson?: unknown;
  question?: unknown;
  subject?: unknown;
}) {
  return question
    ? "Question"
    : lesson
      ? "Lesson"
      : subject
        ? "Subject"
        : course
          ? "Course"
          : "Course library";
}
