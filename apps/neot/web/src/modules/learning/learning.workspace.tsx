import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@neot/ui/components/button";
import { Spinner } from "@neot/ui/components/spinner";
import { learningSectionCopy, type LearningSection } from "./learning.config";
import {
  ClassesAndPeople,
  CourseDrillDown,
  LearningSectionRows,
  Overview,
  PerformanceRows
} from "./learning.content";
import { EnrollmentForm, LearningCreateForm } from "./learning.forms";
import { useLearningMutations, useLearningSnapshot } from "./learning.hooks";
import { TestsAndQuizzes } from "./learning.tests";
import { hasLearningManagePermission } from "../../shared/api/neot-api";

export function LearningWorkspace({ section }: { section: LearningSection }) {
  const query = useLearningSnapshot();
  const mutations = useLearningMutations();
  const [creating, setCreating] = useState(false);
  const copy = learningSectionCopy[section];
  const canManage = hasLearningManagePermission();
  const canCreate =
    !["overview", "performance"].includes(section) &&
    (canManage || section === "questions" || section === "answers");

  if (query.isLoading)
    return (
      <main className="grid min-h-[60vh] place-items-center">
        <Spinner />
      </main>
    );
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
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-9 lg:px-10 lg:py-12">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b pb-7">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-primary">NEOT Learning</p>
          <h1 className="pt-2 text-3xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="pt-3 text-base leading-7 text-muted-foreground">{copy.description}</p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreating((value) => !value)}>
            <PlusIcon /> Add {createLabel(section)}
          </Button>
        ) : null}
      </header>
      {creating && canCreate ? (
        <LearningCreateForm
          onClose={() => setCreating(false)}
          onSave={save}
          section={section as Exclude<LearningSection, "overview" | "performance">}
          snapshot={query.data}
        />
      ) : null}
      {section === "overview" ? <Overview snapshot={query.data} /> : null}
      {section === "courses" ? <CourseDrillDown snapshot={query.data} /> : null}
      {section === "classes" ? (
        <>
          {canManage ? <EnrollmentForm onSave={save} snapshot={query.data} /> : null}
          <ClassesAndPeople snapshot={query.data} />
        </>
      ) : null}
      {section === "subjects" ||
      section === "lessons" ||
      section === "questions" ||
      section === "answers" ? (
        <LearningSectionRows section={section} snapshot={query.data} />
      ) : null}
      {section === "tests" ? (
        <TestsAndQuizzes
          addQuestion={(testUuid, payload) => mutations.addQuestion.mutate({ payload, testUuid })}
          canManage={canManage}
          snapshot={query.data}
          submitAttempt={(testUuid, answers) => mutations.submit.mutate({ answers, testUuid })}
        />
      ) : null}
      {section === "performance" ? <PerformanceRows snapshot={query.data} /> : null}
    </main>
  );
}

function createLabel(section: LearningSection) {
  const labels: Partial<Record<LearningSection, string>> = {
    answers: "answer",
    classes: "class",
    courses: "course",
    lessons: "lesson",
    questions: "question",
    subjects: "subject",
    tests: "test"
  };
  return labels[section] ?? "record";
}
