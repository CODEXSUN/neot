import { randomBytes } from "node:crypto";
import { AppError } from "@neot/framework/errors";
import { sql } from "kysely";
import { getNEOTDatabase } from "../../database/neot-database.js";
import type {
  LearningAnswerInput,
  LearningAttemptInput,
  LearningClassInput,
  LearningCourseInput,
  LearningDiscussionInput,
  LearningEnrollmentInput,
  LearningLessonInput,
  LearningQuestionInput,
  LearningQuizQuestionInput,
  LearningSubjectInput,
  LearningTestInput
} from "./learning.types.js";
import { htmlCourseLessons } from "./html-course.catalog.js";

export class LearningRepository {
  private readonly database = getNEOTDatabase();

  async snapshot(studentEmail: string) {
    const [
      courses,
      classes,
      enrollments,
      subjects,
      lessons,
      questions,
      answers,
      tests,
      quizQuestions,
      attempts,
      progress
    ] = await Promise.all([
      this.database
        .selectFrom("neot_learning_courses")
        .selectAll()
        .orderBy("position", "asc")
        .orderBy("title", "asc")
        .execute(),
      this.database
        .selectFrom("neot_learning_classes")
        .selectAll()
        .orderBy("created_at", "desc")
        .execute(),
      this.database
        .selectFrom("neot_learning_enrollments")
        .selectAll()
        .orderBy("created_at", "desc")
        .execute(),
      this.database.selectFrom("neot_learning_subjects").selectAll().orderBy("position").execute(),
      this.database.selectFrom("neot_learning_lessons").selectAll().orderBy("position").execute(),
      this.database
        .selectFrom("neot_learning_questions")
        .selectAll()
        .orderBy("created_at", "desc")
        .execute(),
      this.database
        .selectFrom("neot_learning_answers")
        .selectAll()
        .orderBy("created_at", "asc")
        .execute(),
      this.database
        .selectFrom("neot_learning_tests")
        .selectAll()
        .orderBy("created_at", "desc")
        .execute(),
      this.database
        .selectFrom("neot_learning_test_questions")
        .selectAll()
        .orderBy("position")
        .execute(),
      this.database
        .selectFrom("neot_learning_attempts")
        .selectAll()
        .orderBy("completed_at", "desc")
        .execute(),
      this.database
        .selectFrom("neot_learning_progress")
        .selectAll()
        .where("student_email", "=", studentEmail)
        .orderBy("last_opened_at", "desc")
        .execute()
    ]);
    return {
      answers: answers.map(camelRow),
      attempts: attempts.map(camelRow),
      classes: classes.map(camelRow),
      courses: courses.map(camelRow),
      enrollments: enrollments.map(camelRow),
      lessons: lessons.map(camelRow),
      performance: performanceSummary(attempts),
      progress: progress.map(camelRow),
      questions: questions.map(camelRow),
      quizQuestions: quizQuestions.map((row) => ({
        ...camelRow(row),
        options: parseOptions(row.options_json),
        correctOption: undefined
      })),
      subjects: subjects.map(camelRow),
      tests: tests.map(camelRow)
    };
  }

  async createCourse(input: LearningCourseInput, actor: string, requestedCode?: string) {
    const uuid = uid();
    const code = await this.nextCourseCode(requestedCode || input.title);
    await this.database
      .insertInto("neot_learning_courses")
      .values({ ...snakeCourse(input), code, created_by: actor, uuid })
      .execute();
    return this.find("neot_learning_courses", uuid);
  }

  async updateCourse(uuid: string, input: LearningCourseInput) {
    await this.requireRecord("neot_learning_courses", uuid, "Course");
    await this.database
      .updateTable("neot_learning_courses")
      .set(snakeCourse(input))
      .where("uuid", "=", uuid)
      .execute();
    return this.find("neot_learning_courses", uuid);
  }

  async ensureHtmlCourse(actor: string) {
    const existing = await this.database
      .selectFrom("neot_learning_courses")
      .selectAll()
      .where("code", "=", "HTML-FOUNDATIONS")
      .executeTakeFirst();
    if (existing) {
      await this.ensureHtmlQuizzes(existing.uuid);
      return this.find("neot_learning_courses", existing.uuid);
    }
    const course = await this.createCourse(
      {
        author: "NEOT Learning",
        coverImage: "",
        description: "Eight simple steps for reading, practicing, and checking core HTML skills.",
        position: 0,
        status: "active",
        theme: "sunrise",
        title: "HTML Course"
      },
      actor,
      "HTML-FOUNDATIONS"
    );
    const subject = await this.createSubject({
      courseUuid: String(course.uuid),
      description: "Build one clear, responsive HTML page step by step.",
      title: "HTML simple steps"
    });
    for (const lesson of htmlCourseLessons) {
      await this.createLesson({
        author: "NEOT Learning",
        content: `${lesson.content}\n\nReference: ${lesson.sourceUrl}`,
        subjectUuid: String(subject.uuid),
        title: lesson.title
      });
    }
    await this.ensureHtmlQuizzes(String(course.uuid));
    return course;
  }

  async saveProgress(lessonUuid: string, studentEmail: string, status: "completed" | "viewed") {
    await this.requireRecord("neot_learning_lessons", lessonUuid, "Lesson");
    const existing = await this.database
      .selectFrom("neot_learning_progress")
      .selectAll()
      .where("student_email", "=", studentEmail)
      .where("lesson_uuid", "=", lessonUuid)
      .executeTakeFirst();
    const completed = status === "completed" || existing?.status === "completed";
    if (existing) {
      await this.database
        .updateTable("neot_learning_progress")
        .set({
          completed_at: completed ? (existing.completed_at ?? new Date()) : null,
          last_opened_at: new Date(),
          status: completed ? "completed" : "viewed"
        })
        .where("id", "=", existing.id)
        .execute();
      return this.find("neot_learning_progress", existing.uuid);
    }
    const uuid = uid();
    await this.database
      .insertInto("neot_learning_progress")
      .values({
        completed_at: completed ? new Date() : null,
        last_opened_at: new Date(),
        lesson_uuid: lessonUuid,
        status: completed ? "completed" : "viewed",
        student_email: studentEmail,
        uuid
      })
      .execute();
    return this.find("neot_learning_progress", uuid);
  }

  async createClass(input: LearningClassInput) {
    await this.requireRecord("neot_learning_courses", input.courseUuid, "Course");
    const uuid = uid();
    await this.database
      .insertInto("neot_learning_classes")
      .values({
        course_uuid: input.courseUuid,
        master_email: input.masterEmail,
        schedule_text: input.scheduleText,
        status: "active",
        title: input.title,
        uuid
      })
      .execute();
    return this.find("neot_learning_classes", uuid);
  }

  async updateClass(uuid: string, input: LearningClassInput) {
    await this.requireRecord("neot_learning_classes", uuid, "Class");
    await this.requireRecord("neot_learning_courses", input.courseUuid, "Course");
    await this.database
      .updateTable("neot_learning_classes")
      .set({
        course_uuid: input.courseUuid,
        master_email: input.masterEmail,
        schedule_text: input.scheduleText,
        title: input.title
      })
      .where("uuid", "=", uuid)
      .execute();
    return this.find("neot_learning_classes", uuid);
  }

  async enroll(input: LearningEnrollmentInput) {
    await this.requireRecord("neot_learning_courses", input.courseUuid, "Course");
    if (input.classUuid)
      await this.requireRecord("neot_learning_classes", input.classUuid, "Class");
    const uuid = uid();
    await this.database
      .insertInto("neot_learning_enrollments")
      .values({
        class_uuid: input.classUuid ?? null,
        course_uuid: input.courseUuid,
        member_email: input.memberEmail,
        member_name: input.memberName,
        role: input.role,
        status: "active",
        uuid
      })
      .execute()
      .catch(() => {
        throw AppError.conflict("This person is already connected to the course or class.");
      });
    return this.find("neot_learning_enrollments", uuid);
  }

  async createSubject(input: LearningSubjectInput) {
    await this.requireRecord("neot_learning_courses", input.courseUuid, "Course");
    const uuid = uid();
    await this.database
      .insertInto("neot_learning_subjects")
      .values({
        course_uuid: input.courseUuid,
        description: input.description,
        position: await this.nextPosition(
          "neot_learning_subjects",
          "course_uuid",
          input.courseUuid
        ),
        title: input.title,
        uuid
      })
      .execute();
    return this.find("neot_learning_subjects", uuid);
  }

  async updateSubject(uuid: string, input: LearningSubjectInput) {
    await this.requireRecord("neot_learning_subjects", uuid, "Subject");
    await this.requireRecord("neot_learning_courses", input.courseUuid, "Course");
    await this.database
      .updateTable("neot_learning_subjects")
      .set({ course_uuid: input.courseUuid, description: input.description, title: input.title })
      .where("uuid", "=", uuid)
      .execute();
    return this.find("neot_learning_subjects", uuid);
  }

  async createLesson(input: LearningLessonInput) {
    await this.requireRecord("neot_learning_subjects", input.subjectUuid, "Subject");
    const uuid = uid();
    await this.database
      .insertInto("neot_learning_lessons")
      .values({
        author: input.author,
        content: input.content,
        position: await this.nextPosition(
          "neot_learning_lessons",
          "subject_uuid",
          input.subjectUuid
        ),
        status: "published",
        subject_uuid: input.subjectUuid,
        title: input.title,
        uuid
      })
      .execute();
    return this.find("neot_learning_lessons", uuid);
  }

  async updateLesson(uuid: string, input: LearningLessonInput) {
    await this.requireRecord("neot_learning_lessons", uuid, "Lesson");
    await this.requireRecord("neot_learning_subjects", input.subjectUuid, "Subject");
    await this.database
      .updateTable("neot_learning_lessons")
      .set({
        author: input.author,
        content: input.content,
        subject_uuid: input.subjectUuid,
        title: input.title
      })
      .where("uuid", "=", uuid)
      .execute();
    return this.find("neot_learning_lessons", uuid);
  }

  async lessonDiscussion(lessonUuid: string) {
    await this.requireRecord("neot_learning_lessons", lessonUuid, "Lesson");
    const posts = await this.database
      .selectFrom("neot_learning_discussion_posts")
      .selectAll()
      .where("lesson_uuid", "=", lessonUuid)
      .orderBy("created_at", "asc")
      .execute();
    return posts.map(camelRow);
  }

  async addLessonDiscussionPost(lessonUuid: string, input: LearningDiscussionInput, actor: string) {
    await this.requireRecord("neot_learning_lessons", lessonUuid, "Lesson");
    if (input.parentUuid) {
      const parent = await this.database
        .selectFrom("neot_learning_discussion_posts")
        .select(["lesson_uuid", "parent_uuid"])
        .where("uuid", "=", input.parentUuid)
        .executeTakeFirst();
      if (!parent || parent.lesson_uuid !== lessonUuid)
        throw AppError.notFound("Discussion post was not found in this lesson.");
      if (parent.parent_uuid) throw AppError.validation("Replies can only have one level.");
    }
    const uuid = uid();
    await this.database
      .insertInto("neot_learning_discussion_posts")
      .values({
        author: actor,
        body: input.body,
        lesson_uuid: lessonUuid,
        parent_uuid: input.parentUuid ?? null,
        uuid
      })
      .execute();
    return this.find("neot_learning_discussion_posts", uuid);
  }

  async createQuestion(input: LearningQuestionInput, actor: string) {
    await this.requireRecord("neot_learning_lessons", input.lessonUuid, "Lesson");
    const uuid = uid();
    await this.database
      .insertInto("neot_learning_questions")
      .values({
        asked_by: actor,
        lesson_uuid: input.lessonUuid,
        question_text: input.questionText,
        status: "open",
        uuid
      })
      .execute();
    return this.find("neot_learning_questions", uuid);
  }

  async createAnswer(input: LearningAnswerInput, actor: string) {
    const question = await this.requireRecord(
      "neot_learning_questions",
      input.questionUuid,
      "Question"
    );
    const uuid = uid();
    await this.database
      .insertInto("neot_learning_answers")
      .values({
        accepted: 0,
        answer_text: input.answerText,
        answered_by: actor,
        question_uuid: input.questionUuid,
        uuid
      })
      .execute();
    await this.database
      .updateTable("neot_learning_questions")
      .set({ status: "answered" })
      .where("uuid", "=", input.questionUuid)
      .execute();
    const tests = await this.database
      .selectFrom("neot_learning_tests")
      .select("uuid")
      .where("lesson_uuid", "=", question.lesson_uuid)
      .execute();
    for (const test of tests) await this.deriveQuizFromQAndA(test.uuid);
    return this.find("neot_learning_answers", uuid);
  }

  async createTest(input: LearningTestInput) {
    await this.requireRecord("neot_learning_courses", input.courseUuid, "Course");
    if (input.lessonUuid)
      await this.requireRecord("neot_learning_lessons", input.lessonUuid, "Lesson");
    const uuid = uid();
    await this.database
      .insertInto("neot_learning_tests")
      .values({
        course_uuid: input.courseUuid,
        instructions: input.instructions,
        lesson_uuid: input.lessonUuid ?? null,
        pass_percentage: input.passPercentage,
        status: "published",
        title: input.title,
        uuid
      })
      .execute();
    if (input.lessonUuid) await this.deriveQuizFromQAndA(uuid);
    return this.find("neot_learning_tests", uuid);
  }

  async deriveQuizFromQAndA(testUuid: string) {
    const test = await this.requireRecord("neot_learning_tests", testUuid, "Test");
    if (!test.lesson_uuid)
      throw AppError.validation("Connect this test to a lesson before deriving Q & A.");
    const [questions, answers, existing] = await Promise.all([
      this.database
        .selectFrom("neot_learning_questions")
        .selectAll()
        .where("lesson_uuid", "=", test.lesson_uuid)
        .orderBy("created_at", "asc")
        .execute(),
      this.database
        .selectFrom("neot_learning_answers")
        .innerJoin(
          "neot_learning_questions",
          "neot_learning_questions.uuid",
          "neot_learning_answers.question_uuid"
        )
        .select([
          "neot_learning_answers.answer_text",
          "neot_learning_answers.question_uuid",
          "neot_learning_answers.accepted",
          "neot_learning_answers.created_at"
        ])
        .where("neot_learning_questions.lesson_uuid", "=", test.lesson_uuid)
        .orderBy("neot_learning_answers.accepted", "desc")
        .orderBy("neot_learning_answers.created_at", "asc")
        .execute(),
      this.database
        .selectFrom("neot_learning_test_questions")
        .select("prompt")
        .where("test_uuid", "=", testUuid)
        .execute()
    ]);
    const existingPrompts = new Set(existing.map((item) => item.prompt));
    let created = 0;
    for (const question of questions) {
      const prompt = question.question_text.slice(0, 2000);
      const correct = answers.find((answer) => answer.question_uuid === question.uuid)?.answer_text;
      if (!correct || existingPrompts.has(prompt)) continue;
      const correctOption = correct.slice(0, 160);
      const distractors = answers
        .filter((answer) => answer.question_uuid !== question.uuid)
        .map((answer) => answer.answer_text.slice(0, 160))
        .filter(
          (answer, index, values) => answer !== correctOption && values.indexOf(answer) === index
        )
        .slice(0, 3);
      if (!distractors.length) continue;
      await this.addQuizQuestion(testUuid, {
        correctOption,
        options: shuffleOptions([correctOption, ...distractors], created),
        points: 1,
        prompt
      });
      existingPrompts.add(prompt);
      created += 1;
    }
    return { created, eligible: questions.length, testUuid };
  }

  async addQuizQuestion(testUuid: string, input: LearningQuizQuestionInput) {
    const test = await this.requireRecord("neot_learning_tests", testUuid, "Test");
    if (!input.options.includes(input.correctOption))
      throw AppError.validation("The correct answer must be one of the quiz options.");
    const uuid = uid();
    await this.database
      .insertInto("neot_learning_test_questions")
      .values({
        correct_option: input.correctOption,
        options_json: JSON.stringify(input.options),
        points: input.points,
        position: await this.nextPosition("neot_learning_test_questions", "test_uuid", testUuid),
        prompt: input.prompt,
        test_uuid: testUuid,
        uuid
      })
      .execute();
    await this.syncQuizQuestionToQAndA(test.lesson_uuid, input.prompt, input.correctOption);
    return { ...(await this.find("neot_learning_test_questions", uuid)), correctOption: undefined };
  }

  private async syncQuizQuestionToQAndA(
    lessonUuid: string | null,
    questionText: string,
    answerText: string
  ) {
    if (!lessonUuid) return;
    let question = await this.database
      .selectFrom("neot_learning_questions")
      .select(["uuid", "status"])
      .where("lesson_uuid", "=", lessonUuid)
      .where("question_text", "=", questionText)
      .executeTakeFirst();
    if (!question) {
      const uuid = uid();
      await this.database
        .insertInto("neot_learning_questions")
        .values({
          asked_by: "NEOT Learning",
          lesson_uuid: lessonUuid,
          question_text: questionText,
          status: "answered",
          uuid
        })
        .execute();
      question = { status: "answered", uuid };
    } else if (question.status !== "answered") {
      await this.database
        .updateTable("neot_learning_questions")
        .set({ status: "answered" })
        .where("uuid", "=", question.uuid)
        .execute();
    }
    const answer = await this.database
      .selectFrom("neot_learning_answers")
      .select("uuid")
      .where("question_uuid", "=", question.uuid)
      .where("answer_text", "=", answerText)
      .executeTakeFirst();
    if (answer) return;
    await this.database
      .insertInto("neot_learning_answers")
      .values({
        accepted: 1,
        answer_text: answerText,
        answered_by: "NEOT Learning",
        question_uuid: question.uuid,
        uuid: uid()
      })
      .execute();
  }

  async submitAttempt(testUuid: string, input: LearningAttemptInput, studentEmail: string) {
    const test = await this.requireRecord("neot_learning_tests", testUuid, "Test");
    const questions = await this.database
      .selectFrom("neot_learning_test_questions")
      .selectAll()
      .where("test_uuid", "=", testUuid)
      .execute();
    if (!questions.length) throw AppError.validation("This test does not have quiz questions yet.");
    const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
    const score = questions.reduce(
      (sum, question) =>
        sum + (input.answers[question.uuid] === question.correct_option ? question.points : 0),
      0
    );
    const percentage = totalPoints ? Number(((score / totalPoints) * 100).toFixed(2)) : 0;
    const uuid = uid();
    await this.database
      .insertInto("neot_learning_attempts")
      .values({
        answers_json: JSON.stringify(input.answers),
        completed_at: new Date(),
        passed: percentage >= test.pass_percentage ? 1 : 0,
        percentage,
        score,
        student_email: studentEmail,
        test_uuid: testUuid,
        total_points: totalPoints,
        uuid
      })
      .execute();
    if (percentage >= test.pass_percentage && test.lesson_uuid)
      await this.saveProgress(test.lesson_uuid, studentEmail, "completed");
    return this.find("neot_learning_attempts", uuid);
  }

  private async ensureHtmlQuizzes(courseUuid: string) {
    const lessons = await this.database
      .selectFrom("neot_learning_lessons")
      .innerJoin(
        "neot_learning_subjects",
        "neot_learning_subjects.uuid",
        "neot_learning_lessons.subject_uuid"
      )
      .select([
        "neot_learning_lessons.uuid",
        "neot_learning_lessons.title",
        "neot_learning_lessons.content"
      ])
      .where("neot_learning_subjects.course_uuid", "=", courseUuid)
      .orderBy("neot_learning_lessons.position")
      .execute();
    for (const [index, lesson] of lessons.entries()) {
      const existing = await this.database
        .selectFrom("neot_learning_tests")
        .select("uuid")
        .where("lesson_uuid", "=", lesson.uuid)
        .executeTakeFirst();
      if (existing) continue;
      const test = await this.createTest({
        courseUuid,
        instructions: "Choose the statement that best matches this lesson.",
        lessonUuid: lesson.uuid,
        passPercentage: 100,
        title: `${lesson.title} check`
      });
      const correctOption = lesson.content.split("\n")[0]?.slice(0, 160) || lesson.title;
      const distractors = [
        lessons[(index + 1) % lessons.length],
        lessons[(index + 2) % lessons.length]
      ].map(
        (item) =>
          item?.content.split("\n")[0]?.slice(0, 160) || item?.title || "Review the lesson again."
      );
      await this.addQuizQuestion(String(test.uuid), {
        correctOption,
        options: shuffleOptions([correctOption, ...distractors], index),
        points: 1,
        prompt: `Which statement best describes ${lesson.title}?`
      });
    }
  }

  private async find(table: TableName, uuid: string) {
    const row = await this.database
      .selectFrom(table)
      .selectAll()
      .where("uuid", "=", uuid)
      .executeTakeFirstOrThrow();
    return camelRow(row);
  }

  private async requireRecord(table: TableName, uuid: string, label: string) {
    const row = await this.database
      .selectFrom(table)
      .selectAll()
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    if (!row) throw AppError.notFound(`${label} was not found.`);
    return row;
  }

  private async nextPosition(table: PositionTable, parentColumn: ParentColumn, parentUuid: string) {
    const result = await this.database
      .selectFrom(table)
      .select(sql<number>`COALESCE(MAX(position), -1) + 1`.as("position"))
      .where(parentColumn, "=", parentUuid)
      .executeTakeFirst();
    return Number(result?.position ?? 0);
  }

  private async nextCourseCode(value: string) {
    const base =
      value
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/giu, "-")
        .replace(/^-|-$/gu, "")
        .toUpperCase()
        .slice(0, 32) || "COURSE";
    const existing = await this.database
      .selectFrom("neot_learning_courses")
      .select("code")
      .where("code", "like", `${base}%`)
      .execute();
    const codes = new Set(existing.map((course) => course.code));
    if (!codes.has(base)) return base;
    let suffix = 2;
    while (codes.has(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  }
}

type TableName =
  | "neot_learning_courses"
  | "neot_learning_classes"
  | "neot_learning_enrollments"
  | "neot_learning_subjects"
  | "neot_learning_lessons"
  | "neot_learning_questions"
  | "neot_learning_answers"
  | "neot_learning_tests"
  | "neot_learning_test_questions"
  | "neot_learning_attempts"
  | "neot_learning_progress"
  | "neot_learning_discussion_posts";
type PositionTable =
  "neot_learning_subjects" | "neot_learning_lessons" | "neot_learning_test_questions";
type ParentColumn = "course_uuid" | "subject_uuid" | "test_uuid";

const uid = () => randomBytes(16).toString("hex");
const snakeCourse = (input: LearningCourseInput) => ({
  author: input.author,
  cover_image: input.coverImage,
  description: input.description,
  position: input.position,
  status: input.status,
  theme: input.theme,
  title: input.title
});
const camelRow = <T extends Record<string, unknown>>(row: T) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/_([a-z])/gu, (_, letter: string) => letter.toUpperCase()),
      value instanceof Date ? value.toISOString() : value
    ])
  );
const parseOptions = (value: string) => {
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
};

function performanceSummary(
  attempts: Array<{ passed: number; percentage: number | string; student_email: string }>
) {
  const students = new Map<string, number[]>();
  for (const attempt of attempts)
    students.set(attempt.student_email, [
      ...(students.get(attempt.student_email) ?? []),
      Number(attempt.percentage)
    ]);
  return [...students]
    .map(([studentEmail, percentages]) => ({
      attempts: percentages.length,
      averagePercentage: Number(
        (percentages.reduce((sum, value) => sum + value, 0) / percentages.length).toFixed(1)
      ),
      bestPercentage: Math.max(...percentages),
      studentEmail
    }))
    .sort((left, right) => right.averagePercentage - left.averagePercentage);
}

function shuffleOptions(options: string[], seed: number) {
  const offset = seed % options.length;
  return [...options.slice(offset), ...options.slice(0, offset)];
}
