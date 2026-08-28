import { ok } from "@neot/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireNEOTActor } from "../../request-context.js";
import { LearningRepository } from "./learning.repository.js";

const repository = new LearningRepository();
const uuidParams = z.object({ uuid: z.string().length(32) }).strict();
const courseSchema = z
  .object({
    code: z.string().trim().min(2).max(40),
    description: z.string().trim().max(3000).default(""),
    title: z.string().trim().min(2).max(220)
  })
  .strict();
const classSchema = z
  .object({
    courseUuid: z.string().length(32),
    masterEmail: z.string().trim().email().or(z.literal("")),
    scheduleText: z.string().trim().max(300).default(""),
    title: z.string().trim().min(2).max(220)
  })
  .strict();
const enrollmentSchema = z
  .object({
    classUuid: z.string().length(32).nullable().optional(),
    courseUuid: z.string().length(32),
    memberEmail: z.string().trim().email(),
    memberName: z.string().trim().max(220).default(""),
    role: z.enum(["master", "student"])
  })
  .strict();
const subjectSchema = z
  .object({
    courseUuid: z.string().length(32),
    description: z.string().trim().max(3000).default(""),
    title: z.string().trim().min(2).max(220)
  })
  .strict();
const lessonSchema = z
  .object({
    content: z.string().trim().max(20_000).default(""),
    subjectUuid: z.string().length(32),
    title: z.string().trim().min(2).max(220)
  })
  .strict();
const questionSchema = z
  .object({ lessonUuid: z.string().length(32), questionText: z.string().trim().min(3).max(4000) })
  .strict();
const answerSchema = z
  .object({ answerText: z.string().trim().min(2).max(8000), questionUuid: z.string().length(32) })
  .strict();
const testSchema = z
  .object({
    courseUuid: z.string().length(32),
    instructions: z.string().trim().max(4000).default(""),
    lessonUuid: z.string().length(32).nullable().optional(),
    passPercentage: z.number().int().min(1).max(100).default(60),
    title: z.string().trim().min(2).max(220)
  })
  .strict();
const quizQuestionSchema = z
  .object({
    correctOption: z.string().trim().min(1).max(160),
    options: z.array(z.string().trim().min(1).max(160)).min(2).max(6),
    points: z.number().int().min(1).max(100).default(1),
    prompt: z.string().trim().min(3).max(2000)
  })
  .strict();
const attemptSchema = z
  .object({ answers: z.record(z.string().length(32), z.string().max(160)) })
  .strict();
const progressSchema = z.object({ status: z.enum(["viewed", "completed"]) }).strict();

export function registerLearningRoutes(app: FastifyInstance) {
  app.get("/learning/snapshot", async (request) =>
    ok(await repository.snapshot(actorEmail()), { requestId: request.id })
  );
  app.post("/learning/courses", async (request) =>
    ok(await repository.createCourse(courseSchema.parse(request.body), actorEmail()), {
      requestId: request.id
    })
  );
  app.put("/learning/courses/:uuid", async (request) =>
    ok(
      await repository.updateCourse(
        uuidParams.parse(request.params).uuid,
        courseSchema.parse(request.body)
      ),
      { requestId: request.id }
    )
  );
  app.post("/learning/courses/html-foundations", async (request) =>
    ok(await repository.ensureHtmlCourse(actorEmail()), { requestId: request.id })
  );
  app.post("/learning/classes", async (request) =>
    ok(await repository.createClass(classSchema.parse(request.body)), { requestId: request.id })
  );
  app.put("/learning/classes/:uuid", async (request) =>
    ok(
      await repository.updateClass(
        uuidParams.parse(request.params).uuid,
        classSchema.parse(request.body)
      ),
      { requestId: request.id }
    )
  );
  app.post("/learning/enrollments", async (request) =>
    ok(await repository.enroll(enrollmentSchema.parse(request.body)), { requestId: request.id })
  );
  app.post("/learning/subjects", async (request) =>
    ok(await repository.createSubject(subjectSchema.parse(request.body)), { requestId: request.id })
  );
  app.put("/learning/subjects/:uuid", async (request) =>
    ok(
      await repository.updateSubject(
        uuidParams.parse(request.params).uuid,
        subjectSchema.parse(request.body)
      ),
      { requestId: request.id }
    )
  );
  app.post("/learning/lessons", async (request) =>
    ok(await repository.createLesson(lessonSchema.parse(request.body)), { requestId: request.id })
  );
  app.put("/learning/lessons/:uuid", async (request) =>
    ok(
      await repository.updateLesson(
        uuidParams.parse(request.params).uuid,
        lessonSchema.parse(request.body)
      ),
      { requestId: request.id }
    )
  );
  app.put("/learning/lessons/:uuid/progress", async (request) =>
    ok(
      await repository.saveProgress(
        uuidParams.parse(request.params).uuid,
        actorEmail(),
        progressSchema.parse(request.body).status
      ),
      { requestId: request.id }
    )
  );
  app.post("/learning/questions", async (request) =>
    ok(await repository.createQuestion(questionSchema.parse(request.body), actorEmail()), {
      requestId: request.id
    })
  );
  app.post("/learning/answers", async (request) =>
    ok(await repository.createAnswer(answerSchema.parse(request.body), actorEmail()), {
      requestId: request.id
    })
  );
  app.post("/learning/tests", async (request) =>
    ok(await repository.createTest(testSchema.parse(request.body)), { requestId: request.id })
  );
  app.post("/learning/tests/:uuid/questions", async (request) =>
    ok(
      await repository.addQuizQuestion(
        uuidParams.parse(request.params).uuid,
        quizQuestionSchema.parse(request.body)
      ),
      { requestId: request.id }
    )
  );
  app.post("/learning/tests/:uuid/attempts", async (request) =>
    ok(
      await repository.submitAttempt(
        uuidParams.parse(request.params).uuid,
        attemptSchema.parse(request.body),
        actorEmail()
      ),
      { requestId: request.id }
    )
  );
}

function actorEmail() {
  const actor = requireNEOTActor();
  return actor.email ?? actor.id;
}
