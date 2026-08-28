import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BotIcon,
  BookOpenIcon,
  EyeIcon,
  ImageIcon,
  MoreVerticalIcon,
  PencilIcon,
  Share2Icon,
  SparklesIcon,
  UserRoundIcon
} from "lucide-react";
import { Button } from "@neot/ui/components/button";
import { Input } from "@neot/ui/components/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@neot/ui/components/dropdown-menu";
import type {
  CourseTheme,
  LearningCourse,
  LearningCoursePayload,
  LearningSnapshot
} from "./learning.types";

type SaveCourse = (payload: LearningCoursePayload, courseUuid?: string) => Promise<unknown>;
type CourseMode =
  | { kind: "list" }
  | { course: LearningCourse; kind: "show" }
  | {
      course?: LearningCourse;
      kind: "upsert";
    };

const themeStyles: Record<CourseTheme, { accent: string; cover: string }> = {
  berry: { accent: "text-fuchsia-950", cover: "bg-fuchsia-100" },
  forest: { accent: "text-emerald-950", cover: "bg-emerald-100" },
  ocean: { accent: "text-sky-950", cover: "bg-sky-100" },
  slate: { accent: "text-slate-950", cover: "bg-slate-200" },
  sunrise: { accent: "text-orange-950", cover: "bg-orange-100" }
};

export function CoursesWorkspace({
  canUpsert,
  creating,
  onCreatingChange,
  onSave,
  saving,
  snapshot
}: {
  canUpsert: boolean;
  creating: boolean;
  onCreatingChange: (creating: boolean) => void;
  onSave: SaveCourse;
  saving: boolean;
  snapshot: LearningSnapshot;
}) {
  const [mode, setMode] = useState<CourseMode>({ kind: "list" });
  const locationSearch = typeof window === "undefined" ? "" : window.location.search;

  useEffect(() => {
    const courseUuid = new URLSearchParams(locationSearch).get("course");
    const course = snapshot.courses.find((item) => item.uuid === courseUuid);
    if (course) setMode({ course, kind: "show" });
  }, [locationSearch, snapshot.courses]);

  if (creating && canUpsert) {
    return (
      <CourseUpsert
        course={undefined}
        onCancel={() => onCreatingChange(false)}
        onSave={async (payload) => {
          const saved = (await onSave(payload)) as LearningCourse;
          onCreatingChange(false);
          setMode({ course: saved, kind: "show" });
        }}
        saving={saving}
      />
    );
  }

  if (mode.kind === "upsert" && canUpsert) {
    return (
      <CourseUpsert
        course={mode.course}
        onCancel={() =>
          setMode(mode.course ? { course: mode.course, kind: "show" } : { kind: "list" })
        }
        onSave={async (payload) => {
          const saved = (await onSave(payload, mode.course?.uuid)) as LearningCourse;
          setMode({ course: saved, kind: "show" });
        }}
        saving={saving}
      />
    );
  }

  if (mode.kind === "show") {
    return (
      <CourseShow
        canUpsert={canUpsert}
        course={mode.course}
        onBack={() => setMode({ kind: "list" })}
        onEdit={() => setMode({ course: mode.course, kind: "upsert" })}
        snapshot={snapshot}
      />
    );
  }

  return (
    <section>
      {snapshot.courses.length ? (
        <div className="grid gap-6 py-7 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.courses.map((course) => (
            <CourseCard
              course={course}
              canManage={canUpsert}
              key={course.uuid}
              onEdit={() => setMode({ course, kind: "upsert" })}
              snapshot={snapshot}
            />
          ))}
        </div>
      ) : (
        <div className="my-8 rounded-2xl border border-dashed p-10 text-center">
          <BookOpenIcon className="mx-auto size-7 text-primary" />
          <p className="pt-4 font-medium">Your first learning path starts here.</p>
          <p className="pt-1 text-sm text-muted-foreground">
            {canUpsert ? "Add a course to begin." : "No courses are available yet."}
          </p>
        </div>
      )}
    </section>
  );
}

function CourseCard({
  canManage,
  course,
  onEdit,
  snapshot
}: {
  canManage: boolean;
  course: LearningCourse;
  onEdit: () => void;
  snapshot: LearningSnapshot;
}) {
  const subjectCount = snapshot.subjects.filter((item) => item.courseUuid === course.uuid).length;
  const showHref = `/app/neot/courses?course=${course.uuid}`;
  const openHref = `/app/neot/subjects?course=${course.uuid}`;
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <a
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        href={openHref}
      >
        <CourseCover course={course} />
        <div className="p-5">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{course.code}</span>
            <span>
              {subjectCount} {subjectCount === 1 ? "subject" : "subjects"}
            </span>
          </div>
          <h3 className="pt-3 text-lg font-semibold tracking-tight">{course.title}</h3>
          <p className="line-clamp-2 min-h-10 pt-2 text-sm leading-5 text-muted-foreground">
            {course.description || "A fresh space to learn, practice, and grow."}
          </p>
          <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <UserRoundIcon className="size-4" /> {course.author || "NEOT Learning"}
            </span>
            <ArrowRightIcon className="size-4 transition group-hover:translate-x-1" />
          </div>
        </div>
      </a>
      {canManage ? <CourseActions course={course} onEdit={onEdit} showHref={showHref} /> : null}
    </div>
  );
}

function CourseActions({
  course,
  onEdit,
  showHref
}: {
  course: LearningCourse;
  onEdit: () => void;
  showHref: string;
}) {
  const share = async () => {
    const url = new URL(showHref, window.location.origin).toString();
    if (navigator.share)
      await navigator.share({ text: course.description, title: course.title, url });
    else await navigator.clipboard.writeText(url);
  };
  const reviewParameters = new URLSearchParams({
    objective: `Review the NEOT course "${course.title}" (${course.code}). Check its learning structure, clarity, coverage, and readiness. Report improvements without changing course data.`,
    source: "honey"
  });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Course actions for ${course.title}`}
          className="absolute right-3 top-3 bg-white/75 shadow-sm backdrop-blur hover:bg-white"
          size="icon"
          variant="ghost"
        >
          <MoreVerticalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={onEdit}>
          <PencilIcon /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={showHref}>
            <EyeIcon /> Show
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void share()}>
          <Share2Icon /> Share
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={`/app/neot/agent-ide?${reviewParameters.toString()}`}>
            <BotIcon /> Review with agent
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CourseCover({ course }: { course: LearningCourse }) {
  const [failed, setFailed] = useState(false);
  if (course.coverImage && !failed) {
    return (
      <img
        alt=""
        className="h-44 w-full object-cover"
        onError={() => setFailed(true)}
        src={course.coverImage}
      />
    );
  }
  const style = themeStyles[course.theme] ?? themeStyles.forest;
  return (
    <div className={`relative h-44 overflow-hidden ${style.cover} ${style.accent}`}>
      <div className="absolute -right-8 -top-10 size-32 rounded-full border-[22px] border-current opacity-10" />
      <div className="absolute -bottom-12 left-10 size-28 rotate-12 rounded-[2rem] bg-current opacity-10" />
      <div className="absolute left-6 top-6 flex size-11 items-center justify-center rounded-2xl bg-white/65 shadow-sm backdrop-blur">
        <SparklesIcon className="size-5" />
      </div>
      <p className="absolute bottom-6 left-6 right-6 text-lg font-semibold leading-6">
        Learn something that changes tomorrow.
      </p>
    </div>
  );
}

function CourseShow({
  canUpsert,
  course,
  onBack,
  onEdit,
  snapshot
}: {
  canUpsert: boolean;
  course: LearningCourse;
  onBack: () => void;
  onEdit: () => void;
  snapshot: LearningSnapshot;
}) {
  const subjects = snapshot.subjects.filter((item) => item.courseUuid === course.uuid);
  const subjectIds = new Set(subjects.map((item) => item.uuid));
  const lessons = snapshot.lessons.filter((item) => subjectIds.has(item.subjectUuid));
  const tests = snapshot.tests.filter((item) => item.courseUuid === course.uuid);
  return (
    <section className="pt-7">
      <div className="flex items-center justify-between gap-4 pb-5">
        <Button asChild variant="ghost">
          <a href="/app/neot/courses" onClick={onBack}>
            <ArrowLeftIcon /> All courses
          </a>
        </Button>
        {canUpsert ? (
          <Button onClick={onEdit} variant="outline">
            <PencilIcon /> Edit course
          </Button>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-3xl border bg-card">
        <CourseCover course={course} />
        <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:p-9">
          <div>
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <span>{course.code}</span>
              <span>·</span>
              <span>{course.status}</span>
            </div>
            <h2 className="pt-3 text-3xl font-semibold tracking-tight">{course.title}</h2>
            <p className="max-w-3xl pt-4 leading-7 text-muted-foreground">
              {course.description ||
                "A focused learning path from first idea to confident practice."}
            </p>
            <p className="flex items-center gap-2 pt-5 text-sm font-medium">
              <UserRoundIcon className="size-4 text-primary" /> {course.author || "NEOT Learning"}
            </p>
          </div>
          <div className="grid min-w-56 grid-cols-3 gap-3 self-end">
            <Metric
              href={`/app/neot/subjects?course=${course.uuid}`}
              label="Subjects"
              value={subjects.length}
            />
            <Metric
              href={`/app/neot/lessons?course=${course.uuid}`}
              label="Lessons"
              value={lessons.length}
            />
            <Metric
              href={`/app/neot/tests?course=${course.uuid}`}
              label="Tests"
              value={tests.length}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <a
      className="rounded-xl bg-muted p-3 text-center transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={href}
    >
      <strong className="block text-xl">{value}</strong>
      <span className="text-xs text-muted-foreground">{label}</span>
    </a>
  );
}

function CourseUpsert({
  course,
  onCancel,
  onSave,
  saving
}: {
  course: LearningCourse | undefined;
  onCancel: () => void;
  onSave: (payload: LearningCoursePayload) => Promise<void>;
  saving: boolean;
}) {
  const [values, setValues] = useState<LearningCoursePayload>({
    author: course?.author ?? "",
    coverImage: course?.coverImage ?? "",
    description: course?.description ?? "",
    position: course?.position ?? 0,
    status: course?.status ?? "draft",
    theme: course?.theme ?? "forest",
    title: course?.title ?? ""
  });
  const set = <Key extends keyof LearningCoursePayload>(
    key: Key,
    value: LearningCoursePayload[Key]
  ) => setValues((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSave(values);
  };
  return (
    <section className="pt-7">
      <Button onClick={onCancel} variant="ghost">
        <ArrowLeftIcon /> Cancel
      </Button>
      <form
        className="mt-5 grid gap-6 rounded-2xl border bg-card p-6 md:grid-cols-2 md:p-8"
        onSubmit={submit}
      >
        <div className="md:col-span-2">
          <p className="text-sm font-medium text-primary">Course upsert</p>
          <h2 className="pt-1 text-2xl font-semibold">
            {course ? "Update course" : "Create course"}
          </h2>
          <p className="pt-2 text-sm text-muted-foreground">
            Course code: {course?.code ?? "generated automatically when saved"}
          </p>
        </div>
        <FormField label="Course name">
          <Input
            required
            maxLength={220}
            value={values.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Creative web foundations"
          />
        </FormField>
        <FormField label="Author">
          <Input
            maxLength={220}
            value={values.author}
            onChange={(event) => set("author", event.target.value)}
            placeholder="Master or organisation name"
          />
        </FormField>
        <FormField label="Cover picture URL">
          <div className="relative">
            <ImageIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              type="url"
              value={values.coverImage}
              onChange={(event) => set("coverImage", event.target.value)}
              placeholder="https://…"
            />
          </div>
        </FormField>
        <FormField label="Theme">
          <select
            className="h-9 rounded-md border bg-background px-3"
            value={values.theme}
            onChange={(event) => set("theme", event.target.value as CourseTheme)}
          >
            {Object.keys(themeStyles).map((theme) => (
              <option key={theme} value={theme}>
                {theme[0]!.toUpperCase() + theme.slice(1)}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Order position">
          <Input
            min="0"
            type="number"
            value={values.position}
            onChange={(event) => set("position", Number(event.target.value))}
          />
        </FormField>
        <FormField label="Status">
          <select
            className="h-9 rounded-md border bg-background px-3"
            value={values.status}
            onChange={(event) => set("status", event.target.value as LearningCourse["status"])}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </FormField>
        <div className="md:col-span-2">
          <FormField label="Course purpose">
            <textarea
              className="min-h-32 rounded-md border bg-background px-3 py-2"
              maxLength={2000}
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
              placeholder="What will students be able to do after this course?"
            />
          </FormField>
        </div>
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={saving} type="submit">
            {saving ? "Saving…" : course ? "Update course" : "Create course"}
          </Button>
        </div>
      </form>
    </section>
  );
}

function FormField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid content-start gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
