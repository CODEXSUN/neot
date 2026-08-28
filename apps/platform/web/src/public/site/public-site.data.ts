import {
  BookOpen,
  Building2,
  GraduationCap,
  HeartHandshake,
  MessageCircleQuestion,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";

export const navigation = [
  { href: "/learning", label: "Learning" },
  { href: "/students", label: "Students" },
  { href: "/masters", label: "Masters" },
  { href: "/organisations", label: "Organisations" },
  { href: "/about", label: "About" }
];

export const featureCards = [
  {
    description:
      "Move from course to subject, lesson, question, and answer without losing context.",
    icon: BookOpen,
    title: "Structured learning"
  },
  {
    description:
      "Bring questions, guidance, feedback, and progress together in one calm workspace.",
    icon: MessageCircleQuestion,
    title: "Support that stays close"
  },
  {
    description:
      "Treat mentoring, learner welfare, and practical skill growth as part of education.",
    icon: HeartHandshake,
    title: "Growth beyond scores"
  }
];

export const audiences = [
  {
    description: "A clear daily view of lessons, questions, feedback, quizzes, and progress.",
    href: "/students",
    icon: GraduationCap,
    label: "For students"
  },
  {
    description: "Focused tools to teach, guide, answer, assess, and notice who needs help.",
    href: "/masters",
    icon: Users,
    label: "For masters"
  },
  {
    description:
      "A shared learning system with roles, responsibility, and organisation-wide clarity.",
    href: "/organisations",
    icon: Building2,
    label: "For organisations"
  }
];

export const pageContent = {
  about: {
    eyebrow: "About NEOT",
    title: "Education should create ownership, not dependency.",
    intro:
      "NEOT means Next Era. Own Tomorrow. We are building a learning environment where structure, human guidance, and practical growth reinforce one another.",
    points: [
      [
        "Our belief",
        "Learners grow faster when expectations are clear and support is easy to reach."
      ],
      [
        "Our approach",
        "Connect the learning journey instead of scattering it across disconnected tools."
      ],
      [
        "Our standard",
        "Keep technology quiet, understandable, and accountable to real educational outcomes."
      ]
    ]
  },
  learning: {
    eyebrow: "The learning model",
    title: "One continuous path from curriculum to confidence.",
    intro:
      "NEOT organises teaching around a simple hierarchy while keeping discussion, assessment, welfare, and skills connected to the learner.",
    points: [
      ["Learn", "Courses lead into subjects and lessons with a clear sense of what comes next."],
      ["Ask", "Questions and answers stay attached to the learning context that created them."],
      [
        "Practise",
        "Quizzes and tests turn knowledge into useful feedback, not just a final score."
      ],
      ["Grow", "Progress, welfare, mentoring, and practical evidence complete the learning record."]
    ]
  },
  masters: {
    eyebrow: "For masters",
    title: "Teach with context. Guide with care.",
    intro:
      "Masters get a focused place to prepare learning, answer questions, review work, and understand where attention matters most.",
    points: [
      [
        "Prepare clearly",
        "Organise courses, subjects, lessons, questions, and assessments in one model."
      ],
      [
        "Respond sooner",
        "See learner questions and support needs without searching across separate channels."
      ],
      [
        "Review meaningfully",
        "Use attempts and progress signals to shape the next teaching decision."
      ],
      [
        "Mentor the whole learner",
        "Keep welfare and skill development visible alongside academic progress."
      ]
    ]
  },
  organisations: {
    eyebrow: "For organisations",
    title: "A shared view of learning and responsibility.",
    intro:
      "NEOT gives education organisations a coherent system for people, curriculum, activity, support, and progress—without turning learning into administration.",
    points: [
      [
        "Clear ownership",
        "Role-aware spaces help students, masters, and administrators focus on their work."
      ],
      [
        "Connected records",
        "Learning activity, assessment, questions, and guidance follow the same structure."
      ],
      [
        "Useful visibility",
        "Leaders can understand participation and needs without interrupting teaching."
      ],
      [
        "Built to evolve",
        "A modular foundation supports new welfare, attendance, and skill evidence workflows."
      ]
    ]
  },
  students: {
    eyebrow: "For students",
    title: "Know what to learn, where to ask, and how you are growing.",
    intro:
      "NEOT gives every student a dependable home for lessons, questions, quizzes, feedback, and the support needed to keep moving.",
    points: [
      ["See the path", "Move through courses, subjects, and lessons with less uncertainty."],
      ["Ask without friction", "Raise a question where it belongs and return to the answer later."],
      ["Learn from attempts", "Use quiz results and feedback to decide what to practise next."],
      [
        "Own your progress",
        "Build a record of learning, practical skills, and personal growth over time."
      ]
    ]
  }
} as const;

export const trustItems = [
  { icon: ShieldCheck, label: "Role-aware access" },
  { icon: Sparkles, label: "Calm, focused experience" },
  { icon: HeartHandshake, label: "Human support included" }
];
