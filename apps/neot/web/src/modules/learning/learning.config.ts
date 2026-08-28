export type LearningSection =
  | "overview"
  | "courses"
  | "classes"
  | "subjects"
  | "lessons"
  | "questions"
  | "answers"
  | "tests"
  | "performance";

export const learningNavigation = [
  ["overview", "Learning home"],
  ["courses", "Courses"],
  ["subjects", "Subjects"],
  ["lessons", "Lessons"],
  ["questions", "Questions"],
  ["answers", "Answers"],
  ["classes", "Classes"],
  ["tests", "Tests & quizzes"],
  ["performance", "Performance"]
] as const;

export const learningSectionCopy: Record<LearningSection, { description: string; title: string }> =
  {
    overview: {
      description:
        "Move from a course into its subjects, lessons, questions, answers, and measured learning outcomes.",
      title: "Learning home"
    },
    courses: {
      description: "Open a course to drill down through its complete learning path.",
      title: "Courses"
    },
    subjects: {
      description: "Subjects organise the curriculum inside each course.",
      title: "Subjects"
    },
    lessons: {
      description: "Lessons hold teaching content, questions, and related tests.",
      title: "Lessons"
    },
    questions: {
      description: "Students ask questions in the lesson where support is needed.",
      title: "Questions"
    },
    answers: {
      description: "Masters and peers preserve clear answers for future learners.",
      title: "Answers"
    },
    classes: {
      description: "Masters teach course classes. Enrolled students attend those classes.",
      title: "Classes"
    },
    tests: {
      description: "Create quizzes, collect attempts, and calculate scores automatically.",
      title: "Tests & quizzes"
    },
    performance: {
      description: "Measure attempts, average scores, best scores, and pass outcomes.",
      title: "Performance"
    }
  };
