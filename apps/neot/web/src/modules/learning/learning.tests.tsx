import { useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleHelpIcon,
  SparklesIcon
} from "lucide-react";
import { Button } from "@neot/ui/components/button";
import { Input } from "@neot/ui/components/input";
import { toast } from "sonner";
import type { LearningSnapshot, LearningTest } from "./learning.types";

export function TestsAndQuizzes({
  addQuestion,
  canManage,
  deriveQuiz,
  snapshot,
  submitAttempt
}: {
  addQuestion: (testUuid: string, payload: Record<string, unknown>) => void;
  canManage: boolean;
  deriveQuiz: (testUuid: string) => Promise<{ created: number; eligible: number }>;
  snapshot: LearningSnapshot;
  submitAttempt: (testUuid: string, answers: Record<string, string>) => void;
}) {
  const [selectedUuid, setSelectedUuid] = useState("");
  const test = snapshot.tests.find((item) => item.uuid === selectedUuid);
  if (test)
    return (
      <QuizRunner
        addQuestion={addQuestion}
        canManage={canManage}
        deriveQuiz={deriveQuiz}
        onBack={() => setSelectedUuid("")}
        snapshot={snapshot}
        submitAttempt={submitAttempt}
        test={test}
      />
    );
  return (
    <section className="py-5">
      {snapshot.tests.map((item) => (
        <button
          className="group flex w-full items-center justify-between gap-5 border-b py-6 text-left"
          key={item.uuid}
          onClick={() => setSelectedUuid(item.uuid)}
          type="button"
        >
          <span>
            <strong className="block text-base font-semibold">{item.title}</strong>
            <span className="block pt-2 text-sm text-muted-foreground">
              {snapshot.courses.find((course) => course.uuid === item.courseUuid)?.title ??
                "Course"}{" "}
              · Pass at {item.passPercentage}% ·{" "}
              {snapshot.quizQuestions.filter((question) => question.testUuid === item.uuid).length}{" "}
              questions
            </span>
          </span>
          <span className="text-sm font-medium text-primary">Open quiz</span>
        </button>
      ))}
      {!snapshot.tests.length ? (
        <p className="border-b py-12 text-sm text-muted-foreground">
          No tests yet. Add a test, then open it to add quiz questions.
        </p>
      ) : null}
    </section>
  );
}

function QuizRunner({
  addQuestion,
  canManage,
  deriveQuiz,
  onBack,
  snapshot,
  submitAttempt,
  test
}: {
  addQuestion: (testUuid: string, payload: Record<string, unknown>) => void;
  canManage: boolean;
  deriveQuiz: (testUuid: string) => Promise<{ created: number; eligible: number }>;
  onBack: () => void;
  snapshot: LearningSnapshot;
  submitAttempt: (testUuid: string, answers: Record<string, string>) => void;
  test: LearningTest;
}) {
  const questions = useMemo(
    () => snapshot.quizQuestions.filter((item) => item.testUuid === test.uuid),
    [snapshot.quizQuestions, test.uuid]
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const question = questions[questionIndex];
  const latest = snapshot.attempts.find((item) => item.testUuid === test.uuid);
  return (
    <section className="pt-4">
      <div className="flex items-center justify-between pb-2">
        <Button aria-label="Back to tests" size="icon" variant="ghost" onClick={onBack}>
          <ArrowLeftIcon />
        </Button>
        {canManage ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={() =>
                void deriveQuiz(test.uuid)
                  .then((result) =>
                    result.created
                      ? toast.success(
                          `${result.created} quiz question${result.created === 1 ? "" : "s"} built from Q & A.`
                        )
                      : toast.info(
                          result.eligible
                            ? "No new quiz questions were needed."
                            : "Add answers to at least two lesson questions first."
                        )
                  )
                  .catch((error: unknown) =>
                    toast.error(error instanceof Error ? error.message : "Quiz could not be built.")
                  )
              }
            >
              <SparklesIcon /> Build from Q & A
            </Button>
            <Button variant="ghost" onClick={() => setAdding((value) => !value)}>
              <CircleHelpIcon /> Add question
            </Button>
          </div>
        ) : null}
      </div>
      {adding ? (
        <QuizQuestionForm
          onCancel={() => setAdding(false)}
          onSave={(payload) => {
            addQuestion(test.uuid, payload);
            setAdding(false);
          }}
        />
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitAttempt(test.uuid, answers);
        }}
      >
        {question ? (
          <>
            <fieldset className="py-7" key={question.uuid}>
              <legend className="text-base font-semibold">{question.prompt}</legend>
              <p className="pt-2 text-sm text-muted-foreground">
                Question {questionIndex + 1} of {questions.length}
              </p>
              <div className="grid gap-3 pt-4">
                {question.options.map((option) => (
                  <label
                    className="flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    key={option}
                  >
                    <input
                      checked={answers[question.uuid] === option}
                      name={question.uuid}
                      onChange={() => setAnswers({ ...answers, [question.uuid]: option })}
                      required
                      type="radio"
                      value={option}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t py-6">
              <div className="flex items-center gap-2">
                <Button
                  disabled={questionIndex === 0}
                  onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
                  type="button"
                  variant="outline"
                >
                  <ArrowLeftIcon /> Previous
                </Button>
                {questionIndex < questions.length - 1 ? (
                  <Button
                    disabled={!answers[question.uuid]}
                    onClick={() => setQuestionIndex((index) => index + 1)}
                    type="button"
                  >
                    Forward <ArrowRightIcon />
                  </Button>
                ) : (
                  <Button disabled={Object.keys(answers).length !== questions.length} type="submit">
                    Submit quiz
                  </Button>
                )}
              </div>
              {latest ? (
                <p className="flex items-center gap-2 text-sm">
                  <CheckCircle2Icon
                    className={latest.passed ? "text-emerald-600" : "text-amber-600"}
                    size={18}
                  />
                  Latest score: <strong>{latest.percentage}%</strong>
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </form>
    </section>
  );
}

function QuizQuestionForm({
  onCancel,
  onSave
}: {
  onCancel: () => void;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState("");
  return (
    <form
      className="grid gap-5 border-b py-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ correctOption, options: options.filter(Boolean), points: 1, prompt });
      }}
    >
      <label className="grid gap-2 text-sm font-medium">
        Question
        <Input required value={prompt} onChange={(event) => setPrompt(event.target.value)} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        {options.map((option, index) => (
          <label className="grid gap-2 text-sm font-medium" key={index}>
            Option {index + 1}
            <Input
              required={index < 2}
              value={option}
              onChange={(event) =>
                setOptions(
                  options.map((value, optionIndex) =>
                    optionIndex === index ? event.target.value : value
                  )
                )
              }
            />
          </label>
        ))}
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Correct option
        <select
          required
          className="h-9 rounded-md border bg-background px-3"
          value={correctOption}
          onChange={(event) => setCorrectOption(event.target.value)}
        >
          <option value="">Select correct option</option>
          {options.filter(Boolean).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save question</Button>
      </div>
    </form>
  );
}
