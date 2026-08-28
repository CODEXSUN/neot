export type LearningRole = "master" | "student";

export type LearningCourseInput = {
  author: string;
  coverImage: string;
  description: string;
  position: number;
  status: "active" | "archived" | "draft";
  theme: "berry" | "forest" | "ocean" | "slate" | "sunrise";
  title: string;
};
export type LearningClassInput = {
  courseUuid: string;
  masterEmail: string;
  scheduleText: string;
  title: string;
};
export type LearningEnrollmentInput = {
  classUuid?: string | null | undefined;
  courseUuid: string;
  memberEmail: string;
  memberName: string;
  role: LearningRole;
};
export type LearningSubjectInput = { courseUuid: string; description: string; title: string };
export type LearningLessonInput = {
  author: string;
  content: string;
  subjectUuid: string;
  title: string;
};
export type LearningDiscussionInput = { body: string; parentUuid?: string | null | undefined };
export type LearningQuestionInput = { lessonUuid: string; questionText: string };
export type LearningAnswerInput = { answerText: string; questionUuid: string };
export type LearningTestInput = {
  courseUuid: string;
  instructions: string;
  lessonUuid?: string | null | undefined;
  passPercentage: number;
  title: string;
};
export type LearningQuizQuestionInput = {
  correctOption: string;
  options: string[];
  points: number;
  prompt: string;
};
export type LearningAttemptInput = { answers: Record<string, string> };
