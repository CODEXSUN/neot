import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@neot/ui/components/button";
import { Input } from "@neot/ui/components/input";
import type { LearningSection } from "./learning.config";
import type { LearningSnapshot } from "./learning.types";

type Save = (resource: string, payload: Record<string, unknown>) => void;

export function LearningCreateForm({
  onClose,
  onSave,
  section,
  snapshot
}: {
  onClose: () => void;
  onSave: Save;
  section: Exclude<LearningSection, "courses" | "performance">;
  snapshot: LearningSnapshot;
}) {
  const [values, setValues] = useState<Record<string, string>>({
    passPercentage: "60",
    role: "student"
  });
  const set = (key: string, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = createPayload(section, values);
    onSave(result.resource, result.payload);
  };
  return (
    <form className="mt-7 grid gap-5 border-y py-6 sm:grid-cols-2" onSubmit={submit}>
      {section === "subjects" ? (
        <>
          <CourseSelect
            snapshot={snapshot}
            value={values.courseUuid ?? ""}
            onChange={(value) => set("courseUuid", value)}
          />
          <Field label="Subject name">
            <Input
              required
              value={values.title ?? ""}
              onChange={(event) => set("title", event.target.value)}
            />
          </Field>
          <WideField label="Subject outcome">
            <textarea
              className="min-h-24 rounded-md border bg-background px-3 py-2"
              value={values.description ?? ""}
              onChange={(event) => set("description", event.target.value)}
            />
          </WideField>
        </>
      ) : null}
      {section === "lessons" ? (
        <>
          <SubjectSelect
            snapshot={snapshot}
            value={values.subjectUuid ?? ""}
            onChange={(value) => set("subjectUuid", value)}
          />
          <Field label="Lesson name">
            <Input
              required
              value={values.title ?? ""}
              onChange={(event) => set("title", event.target.value)}
            />
          </Field>
          <Field label="Author">
            <Input
              value={values.author ?? ""}
              onChange={(event) => set("author", event.target.value)}
              placeholder="Master or organisation name"
            />
          </Field>
          <WideField label="Lesson content">
            <textarea
              className="min-h-32 rounded-md border bg-background px-3 py-2"
              value={values.content ?? ""}
              onChange={(event) => set("content", event.target.value)}
            />
          </WideField>
        </>
      ) : null}
      {section === "questions" ? (
        <>
          <LessonSelect
            snapshot={snapshot}
            value={values.lessonUuid ?? ""}
            onChange={(value) => set("lessonUuid", value)}
          />
          <WideField label="Question">
            <textarea
              required
              className="min-h-28 rounded-md border bg-background px-3 py-2"
              value={values.questionText ?? ""}
              onChange={(event) => set("questionText", event.target.value)}
            />
          </WideField>
        </>
      ) : null}
      {section === "classes" ? (
        <>
          <CourseSelect
            snapshot={snapshot}
            value={values.courseUuid ?? ""}
            onChange={(value) => set("courseUuid", value)}
          />
          <Field label="Class name">
            <Input
              required
              value={values.title ?? ""}
              onChange={(event) => set("title", event.target.value)}
              placeholder="Saturday cohort"
            />
          </Field>
          <Field label="Master email">
            <Input
              type="email"
              value={values.masterEmail ?? ""}
              onChange={(event) => set("masterEmail", event.target.value)}
            />
          </Field>
          <Field label="Schedule">
            <Input
              value={values.scheduleText ?? ""}
              onChange={(event) => set("scheduleText", event.target.value)}
              placeholder="Saturday, 10:00 AM"
            />
          </Field>
        </>
      ) : null}
      {section === "tests" ? (
        <>
          <CourseSelect
            snapshot={snapshot}
            value={values.courseUuid ?? ""}
            onChange={(value) => set("courseUuid", value)}
          />
          <LessonSelect
            optional
            snapshot={snapshot}
            value={values.lessonUuid ?? ""}
            onChange={(value) => set("lessonUuid", value)}
          />
          <Field label="Test name">
            <Input
              required
              value={values.title ?? ""}
              onChange={(event) => set("title", event.target.value)}
            />
          </Field>
          <Field label="Pass percentage">
            <Input
              min="1"
              max="100"
              type="number"
              value={values.passPercentage ?? "60"}
              onChange={(event) => set("passPercentage", event.target.value)}
            />
          </Field>
          <WideField label="Instructions">
            <textarea
              className="min-h-24 rounded-md border bg-background px-3 py-2"
              value={values.instructions ?? ""}
              onChange={(event) => set("instructions", event.target.value)}
            />
          </WideField>
        </>
      ) : null}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

export function EnrollmentForm({ onSave, snapshot }: { onSave: Save; snapshot: LearningSnapshot }) {
  const [values, setValues] = useState({
    classUuid: "",
    courseUuid: "",
    memberEmail: "",
    memberName: "",
    role: "student"
  });
  const classes = snapshot.classes.filter((item) => item.courseUuid === values.courseUuid);
  return (
    <form
      className="grid gap-4 border-b py-6 md:grid-cols-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave("enrollments", { ...values, classUuid: values.classUuid || null });
      }}
    >
      <CourseSelect
        snapshot={snapshot}
        value={values.courseUuid}
        onChange={(courseUuid) => setValues({ ...values, classUuid: "", courseUuid })}
      />
      <Field label="Role">
        <select
          className="h-9 rounded-md border bg-background px-3"
          value={values.role}
          onChange={(event) => setValues({ ...values, role: event.target.value })}
        >
          <option value="student">Student</option>
          <option value="master">Master</option>
        </select>
      </Field>
      <Field label="Name">
        <Input
          required
          value={values.memberName}
          onChange={(event) => setValues({ ...values, memberName: event.target.value })}
        />
      </Field>
      <Field label="Email">
        <Input
          required
          type="email"
          value={values.memberEmail}
          onChange={(event) => setValues({ ...values, memberEmail: event.target.value })}
        />
      </Field>
      <Field label="Attend class">
        <select
          className="h-9 rounded-md border bg-background px-3"
          value={values.classUuid}
          onChange={(event) => setValues({ ...values, classUuid: event.target.value })}
        >
          <option value="">Course only</option>
          {classes.map((item) => (
            <option key={item.uuid} value={item.uuid}>
              {item.title}
            </option>
          ))}
        </select>
      </Field>
      <div className="md:col-span-5 flex justify-end">
        <Button type="submit">Connect person</Button>
      </div>
    </form>
  );
}

function createPayload(section: string, values: Record<string, string>) {
  const resources: Record<string, string> = {
    classes: "classes",
    lessons: "lessons",
    questions: "questions",
    subjects: "subjects",
    tests: "tests"
  };
  const fields: Record<string, string[]> = {
    classes: ["courseUuid", "masterEmail", "scheduleText", "title"],
    lessons: ["author", "content", "subjectUuid", "title"],
    questions: ["lessonUuid", "questionText"],
    subjects: ["courseUuid", "description", "title"],
    tests: ["courseUuid", "instructions", "lessonUuid", "passPercentage", "title"]
  };
  const payload = Object.fromEntries(
    (fields[section] ?? []).map((field) => [field, values[field] ?? ""])
  ) as Record<string, unknown>;
  if (section === "tests") {
    payload.passPercentage = Number(values.passPercentage || 60);
    payload.lessonUuid = values.lessonUuid || null;
  }
  return { payload, resource: resources[section]! };
}

function CourseSelect({ onChange, snapshot, value }: SelectProps) {
  return (
    <Field label="Course">
      <select
        required
        className="h-9 rounded-md border bg-background px-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select course</option>
        {snapshot.courses.map((item) => (
          <option key={item.uuid} value={item.uuid}>
            {item.code} · {item.title}
          </option>
        ))}
      </select>
    </Field>
  );
}
function SubjectSelect({ onChange, snapshot, value }: SelectProps) {
  return (
    <Field label="Subject">
      <select
        required
        className="h-9 rounded-md border bg-background px-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select subject</option>
        {snapshot.subjects.map((item) => (
          <option key={item.uuid} value={item.uuid}>
            {item.title}
          </option>
        ))}
      </select>
    </Field>
  );
}
function LessonSelect({
  onChange,
  optional = false,
  snapshot,
  value
}: SelectProps & { optional?: boolean }) {
  return (
    <Field label="Lesson">
      <select
        required={!optional}
        className="h-9 rounded-md border bg-background px-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{optional ? "Whole course" : "Select lesson"}</option>
        {snapshot.lessons.map((item) => (
          <option key={item.uuid} value={item.uuid}>
            {item.title}
          </option>
        ))}
      </select>
    </Field>
  );
}
type SelectProps = { onChange: (value: string) => void; snapshot: LearningSnapshot; value: string };
function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid content-start gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
function WideField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="sm:col-span-2">
      <Field label={label}>{children}</Field>
    </div>
  );
}
