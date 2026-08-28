export type LearningSection =
  "courses" | "classes" | "subjects" | "lessons" | "questions" | "tests" | "performance";

export const learningSectionCopy: Record<LearningSection, { description: string; title: string }> =
  {
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
      description: "Ask questions, share clear answers, and preserve useful guidance together.",
      title: "Q & A"
    },
    classes: {
      description: "Masters teach course classes. Enrolled students attend those classes.",
      title: "Classes"
    },
    tests: {
      description: "",
      title: "Tests & quizzes"
    },
    performance: {
      description: "Measure attempts, average scores, best scores, and pass outcomes.",
      title: "Performance"
    }
  };
