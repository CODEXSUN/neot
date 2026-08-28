import { useEffect, useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@neot/ui/components/button";
import { Spinner } from "@neot/ui/components/spinner";
import { learningSectionCopy, type LearningSection } from "./learning.config";
import { ClassesAndPeople, PerformanceRows } from "./learning.content";
import { CoursesWorkspace } from "./learning.courses";
import { EnrollmentForm, LearningCreateForm } from "./learning.forms";
import { useLearningMutations, useLearningSnapshot } from "./learning.hooks";
import { LessonCards, SubjectCards } from "./learning.path";
import { QAndAWorkspace } from "./learning.q-and-a";
import { TestsAndQuizzes } from "./learning.tests";
import type { LearningSnapshot } from "./learning.types";
import { hasLearningManagePermission } from "../../shared/api/neot-api";

export function LearningWorkspace({ section }: { section: LearningSection }) {
  const query = useLearningSnapshot();
  const mutations = useLearningMutations();
  const [creating, setCreating] = useState(false);
  const copy = learningSectionCopy[section];
  const canManage = hasLearningManagePermission();
  const canCreate =
    (section === "courses" && canManage) ||
    (!["courses", "performance"].includes(section) && (canManage || section === "questions"));

  if (query.isLoading) return <DelayedLearningLoader />;
  if (!query.data)
    return (
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <p className="border-b py-10 text-sm text-destructive">
          {query.error instanceof Error
            ? query.error.message
            : "Learning data could not be loaded."}
        </p>
      </main>
    );

  const save = (resource: string, payload: Record<string, unknown>) =>
    mutations.create.mutate({ payload, resource }, { onSuccess: () => setCreating(false) });
  const displaySnapshot = filterSnapshotByCourse(query.data, section);
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-9 lg:px-10 lg:py-12">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b pb-7">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-primary">NEOT Learning</p>
          <h1 className="pt-2 text-3xl font-semibold tracking-tight">{copy.title}</h1>
          {copy.description ? (
            <p className="pt-3 text-base leading-7 text-muted-foreground">{copy.description}</p>
          ) : null}
        </div>
        {canCreate ? (
          <Button onClick={() => setCreating((value) => !value)}>
            {section !== "tests" ? <PlusIcon /> : null} Add {createLabel(section)}
          </Button>
        ) : null}
      </header>
      {creating && canCreate && section !== "courses" ? (
        <LearningCreateForm
          onClose={() => setCreating(false)}
          onSave={save}
          section={section as Exclude<LearningSection, "courses" | "performance">}
          snapshot={query.data}
        />
      ) : null}
      {section === "courses" ? (
        <CoursesWorkspace
          canUpsert={canManage}
          creating={creating}
          onCreatingChange={setCreating}
          onSave={(payload, courseUuid) =>
            courseUuid
              ? mutations.updateCourse.mutateAsync({ courseUuid, payload })
              : mutations.createCourse.mutateAsync(payload)
          }
          saving={mutations.createCourse.isPending || mutations.updateCourse.isPending}
          snapshot={query.data}
        />
      ) : null}
      {section === "classes" ? (
        <>
          {canManage ? <EnrollmentForm onSave={save} snapshot={query.data} /> : null}
          <ClassesAndPeople snapshot={query.data} />
        </>
      ) : null}
      {section === "subjects" ? <SubjectCards snapshot={displaySnapshot} /> : null}
      {section === "lessons" ? <LessonCards snapshot={displaySnapshot} /> : null}
      {section === "questions" ? (
        <QAndAWorkspace
          onAnswer={(questionUuid, answerText) =>
            mutations.create.mutateAsync({
              payload: { answerText, questionUuid },
              resource: "answers"
            })
          }
          snapshot={displaySnapshot}
        />
      ) : null}
      {section === "tests" ? (
        <TestsAndQuizzes
          addQuestion={(testUuid, payload) => mutations.addQuestion.mutate({ payload, testUuid })}
          canManage={canManage}
          deriveQuiz={(testUuid) => mutations.deriveQuiz.mutateAsync(testUuid)}
          snapshot={displaySnapshot}
          submitAttempt={(testUuid, answers) => mutations.submit.mutate({ answers, testUuid })}
        />
      ) : null}
      {section === "performance" ? <PerformanceRows snapshot={query.data} /> : null}
    </main>
  );
}

function DelayedLearningLoader() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(true), 180);
    return () => window.clearTimeout(timeout);
  }, []);
  return visible ? (
    <main className="grid min-h-[60vh] place-items-center">
      <Spinner />
    </main>
  ) : null;
}

function filterSnapshotByCourse(snapshot: LearningSnapshot, section: LearningSection) {
  if (
    typeof window === "undefined" ||
    !["lessons", "questions", "subjects", "tests"].includes(section)
  ) {
    return snapshot;
  }
  const parameters = new URLSearchParams(window.location.search);
  const courseUuid = parameters.get("course");
  const lessonUuid = parameters.get("lesson");
  const subjectUuid = parameters.get("subject");
  const hasCourse = courseUuid && snapshot.courses.some((course) => course.uuid === courseUuid);
  if (!hasCourse && !subjectUuid && !lessonUuid) return snapshot;
  const subjects = hasCourse
    ? snapshot.subjects.filter((subject) => subject.courseUuid === courseUuid)
    : snapshot.subjects;
  const subjectUuids = new Set(subjects.map((subject) => subject.uuid));
  const questions = lessonUuid
    ? snapshot.questions.filter((question) => question.lessonUuid === lessonUuid)
    : snapshot.questions;
  const questionUuids = new Set(questions.map((question) => question.uuid));
  return {
    ...snapshot,
    answers: lessonUuid
      ? snapshot.answers.filter((answer) => questionUuids.has(answer.questionUuid))
      : snapshot.answers,
    lessons:
      section === "lessons"
        ? snapshot.lessons.filter((lesson) =>
            subjectUuid ? lesson.subjectUuid === subjectUuid : subjectUuids.has(lesson.subjectUuid)
          )
        : snapshot.lessons,
    subjects: section === "subjects" ? subjects : snapshot.subjects,
    questions: section === "questions" ? questions : snapshot.questions,
    tests:
      section === "tests"
        ? snapshot.tests.filter((test) =>
            lessonUuid ? test.lessonUuid === lessonUuid : test.courseUuid === courseUuid
          )
        : snapshot.tests
  };
}

function createLabel(section: LearningSection) {
  const labels: Partial<Record<LearningSection, string>> = {
    classes: "class",
    courses: "course",
    lessons: "lesson",
    questions: "question",
    subjects: "subject",
    tests: "test"
  };
  return labels[section] ?? "record";
}
