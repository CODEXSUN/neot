type BaseRecord = { createdAt: string; id: number; uuid: string };
export type LearningCourse = BaseRecord & {
  author: string;
  code: string;
  coverImage: string;
  description: string;
  position: number;
  status: "active" | "archived" | "draft";
  theme: CourseTheme;
  title: string;
};
export type CourseTheme = "berry" | "forest" | "ocean" | "slate" | "sunrise";
export type LearningCoursePayload = {
  author: string;
  coverImage: string;
  description: string;
  position: number;
  status: LearningCourse["status"];
  theme: CourseTheme;
  title: string;
};
export type LearningClass = BaseRecord & {
  courseUuid: string;
  masterEmail: string;
  scheduleText: string;
  status: string;
  title: string;
};
export type LearningEnrollment = BaseRecord & {
  classUuid: string | null;
  courseUuid: string;
  memberEmail: string;
  memberName: string;
  role: "master" | "student";
  status: string;
};
export type LearningSubject = BaseRecord & {
  courseUuid: string;
  description: string;
  position: number;
  title: string;
};
export type LearningLesson = BaseRecord & {
  author: string;
  content: string;
  position: number;
  status: string;
  subjectUuid: string;
  title: string;
};
export type LearningDiscussionPost = BaseRecord & {
  author: string;
  body: string;
  lessonUuid: string;
  parentUuid: string | null;
};
export type LearningQuestion = BaseRecord & {
  askedBy: string;
  lessonUuid: string;
  questionText: string;
  status: string;
};
export type LearningAnswer = BaseRecord & {
  accepted: number;
  answerText: string;
  answeredBy: string;
  questionUuid: string;
};
export type LearningTest = BaseRecord & {
  courseUuid: string;
  instructions: string;
  lessonUuid: string | null;
  passPercentage: number;
  status: string;
  title: string;
};
export type LearningQuizQuestion = BaseRecord & {
  options: string[];
  points: number;
  position: number;
  prompt: string;
  testUuid: string;
};
export type LearningAttempt = BaseRecord & {
  completedAt: string;
  passed: number;
  percentage: number;
  score: number;
  studentEmail: string;
  testUuid: string;
  totalPoints: number;
};
export type LearningPerformance = {
  attempts: number;
  averagePercentage: number;
  bestPercentage: number;
  studentEmail: string;
};
export type LearningSnapshot = {
  answers: LearningAnswer[];
  attempts: LearningAttempt[];
  classes: LearningClass[];
  courses: LearningCourse[];
  enrollments: LearningEnrollment[];
  lessons: LearningLesson[];
  performance: LearningPerformance[];
  questions: LearningQuestion[];
  quizQuestions: LearningQuizQuestion[];
  subjects: LearningSubject[];
  tests: LearningTest[];
};
