import { sql, type Kysely } from "kysely";
import type { NEOTDatabase } from "../../database/schema.js";

export const learningMigration = {
  description: "Courses, classes, learning content, quizzes, and performance.",
  key: "neot.learning.sql.v1"
} as const;

export const learningProgressMigration = {
  description: "Per-student lesson resume and completion state.",
  key: "neot.learning.progress.sql.v2"
} as const;

export const learningCourseMetadataMigration = {
  description: "Course covers, themes, authors, and library ordering.",
  key: "neot.learning.course-metadata.sql.v3"
} as const;

export const learningLessonDiscussionMigration = {
  description: "Lesson authors and forum-connected threaded discussions.",
  key: "neot.learning.lesson-discussions.sql.v4"
} as const;

export const learningQuizQAndABackfillMigration = {
  description: "Backfill lesson Q & A from existing quiz questions.",
  key: "neot.learning.quiz-q-and-a-backfill.sql.v5"
} as const;

export async function migrateLearningModule(database: Kysely<NEOTDatabase>) {
  await sql`CREATE TABLE IF NOT EXISTS neot_learning_courses (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(32) NOT NULL, code VARCHAR(40) NOT NULL,
    title VARCHAR(220) NOT NULL, description TEXT NOT NULL, cover_image VARCHAR(1000) NOT NULL DEFAULT '',
    theme VARCHAR(24) NOT NULL DEFAULT 'forest', position INT NOT NULL DEFAULT 0,
    author VARCHAR(220) NOT NULL DEFAULT '', status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_by VARCHAR(240) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_learning_courses_uuid (uuid), UNIQUE KEY uq_neot_learning_courses_code (code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_learning_classes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(32) NOT NULL, course_uuid CHAR(32) NOT NULL,
    title VARCHAR(220) NOT NULL, schedule_text VARCHAR(300) NOT NULL DEFAULT '', master_email VARCHAR(240) NOT NULL DEFAULT '',
    status VARCHAR(24) NOT NULL DEFAULT 'active', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_learning_classes_uuid (uuid), KEY idx_neot_learning_classes_course (course_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_learning_enrollments (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(32) NOT NULL, course_uuid CHAR(32) NOT NULL,
    class_uuid CHAR(32) NULL, member_email VARCHAR(240) NOT NULL, member_name VARCHAR(220) NOT NULL DEFAULT '',
    role VARCHAR(24) NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_neot_learning_enrollments_uuid (uuid),
    UNIQUE KEY uq_neot_learning_member (course_uuid, class_uuid, member_email, role),
    KEY idx_neot_learning_enrollments_course (course_uuid, role)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_learning_subjects (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(32) NOT NULL, course_uuid CHAR(32) NOT NULL,
    title VARCHAR(220) NOT NULL, description TEXT NOT NULL, position INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_learning_subjects_uuid (uuid), KEY idx_neot_learning_subjects_course (course_uuid, position)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_learning_lessons (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(32) NOT NULL, subject_uuid CHAR(32) NOT NULL,
    title VARCHAR(220) NOT NULL, content TEXT NOT NULL, author VARCHAR(220) NOT NULL DEFAULT '', position INT NOT NULL DEFAULT 0,
    status VARCHAR(24) NOT NULL DEFAULT 'draft', created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_learning_lessons_uuid (uuid), KEY idx_neot_learning_lessons_subject (subject_uuid, position)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_learning_questions (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(32) NOT NULL, lesson_uuid CHAR(32) NOT NULL,
    asked_by VARCHAR(240) NOT NULL, question_text TEXT NOT NULL, status VARCHAR(24) NOT NULL DEFAULT 'open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_learning_questions_uuid (uuid), KEY idx_neot_learning_questions_lesson (lesson_uuid, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_learning_answers (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(32) NOT NULL, question_uuid CHAR(32) NOT NULL,
    answered_by VARCHAR(240) NOT NULL, answer_text TEXT NOT NULL, accepted TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_learning_answers_uuid (uuid), KEY idx_neot_learning_answers_question (question_uuid, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_learning_tests (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(32) NOT NULL, course_uuid CHAR(32) NOT NULL,
    lesson_uuid CHAR(32) NULL, title VARCHAR(220) NOT NULL, instructions TEXT NOT NULL,
    pass_percentage INT NOT NULL DEFAULT 60, status VARCHAR(24) NOT NULL DEFAULT 'draft',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_learning_tests_uuid (uuid), KEY idx_neot_learning_tests_course (course_uuid, lesson_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_learning_test_questions (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(32) NOT NULL, test_uuid CHAR(32) NOT NULL,
    prompt TEXT NOT NULL, options_json TEXT NOT NULL, correct_option VARCHAR(160) NOT NULL,
    points INT NOT NULL DEFAULT 1, position INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_learning_test_questions_uuid (uuid), KEY idx_neot_learning_test_questions_test (test_uuid, position)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_learning_attempts (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(32) NOT NULL, test_uuid CHAR(32) NOT NULL,
    student_email VARCHAR(240) NOT NULL, answers_json TEXT NOT NULL, score INT NOT NULL,
    total_points INT NOT NULL, percentage DECIMAL(6,2) NOT NULL, passed TINYINT(1) NOT NULL DEFAULT 0,
    completed_at DATETIME NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_learning_attempts_uuid (uuid), KEY idx_neot_learning_attempts_student (student_email, completed_at),
    KEY idx_neot_learning_attempts_test (test_uuid, completed_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  return learningMigration;
}

export async function migrateLearningCourseMetadata(database: Kysely<NEOTDatabase>) {
  await sql`ALTER TABLE neot_learning_courses
    ADD COLUMN IF NOT EXISTS cover_image VARCHAR(1000) NOT NULL DEFAULT '' AFTER description,
    ADD COLUMN IF NOT EXISTS theme VARCHAR(24) NOT NULL DEFAULT 'forest' AFTER cover_image,
    ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0 AFTER theme,
    ADD COLUMN IF NOT EXISTS author VARCHAR(220) NOT NULL DEFAULT '' AFTER position,
    ADD INDEX IF NOT EXISTS idx_neot_learning_courses_library (status, position, title)
  `.execute(database);
  return learningCourseMetadataMigration;
}

export async function migrateLearningLessonDiscussions(database: Kysely<NEOTDatabase>) {
  await sql`ALTER TABLE neot_learning_lessons
    ADD COLUMN IF NOT EXISTS author VARCHAR(220) NOT NULL DEFAULT '' AFTER content
  `.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS neot_learning_discussion_posts (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(32) NOT NULL,
    lesson_uuid CHAR(32) NOT NULL, parent_uuid CHAR(32) NULL, body TEXT NOT NULL,
    author VARCHAR(240) NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_learning_discussion_posts_uuid (uuid),
    KEY idx_neot_learning_discussion_topic (lesson_uuid, created_at),
    KEY idx_neot_learning_discussion_parent (parent_uuid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  return learningLessonDiscussionMigration;
}

export async function migrateLearningQuizQAndABackfill(database: Kysely<NEOTDatabase>) {
  await sql`INSERT IGNORE INTO neot_learning_questions
    (uuid, lesson_uuid, asked_by, question_text, status)
    SELECT
      LOWER(MD5(CONCAT('quiz-q-and-a:', tests.lesson_uuid, ':', quiz.prompt))),
      tests.lesson_uuid,
      'NEOT Learning',
      quiz.prompt,
      'answered'
    FROM neot_learning_test_questions quiz
    INNER JOIN neot_learning_tests tests ON tests.uuid = quiz.test_uuid
    WHERE tests.lesson_uuid IS NOT NULL
  `.execute(database);
  await sql`INSERT IGNORE INTO neot_learning_answers
    (uuid, question_uuid, answered_by, answer_text, accepted)
    SELECT
      LOWER(MD5(CONCAT('quiz-answer:', questions.uuid, ':', quiz.correct_option))),
      questions.uuid,
      'NEOT Learning',
      quiz.correct_option,
      1
    FROM neot_learning_test_questions quiz
    INNER JOIN neot_learning_tests tests ON tests.uuid = quiz.test_uuid
    INNER JOIN neot_learning_questions questions
      ON questions.lesson_uuid = tests.lesson_uuid AND questions.question_text = quiz.prompt
    WHERE tests.lesson_uuid IS NOT NULL
  `.execute(database);
  await sql`UPDATE neot_learning_questions questions
    INNER JOIN neot_learning_tests tests ON tests.lesson_uuid = questions.lesson_uuid
    INNER JOIN neot_learning_test_questions quiz
      ON quiz.test_uuid = tests.uuid AND quiz.prompt = questions.question_text
    SET questions.status = 'answered'
  `.execute(database);
  return learningQuizQAndABackfillMigration;
}

export async function migrateLearningProgress(database: Kysely<NEOTDatabase>) {
  await sql`CREATE TABLE IF NOT EXISTS neot_learning_progress (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(32) NOT NULL,
    student_email VARCHAR(240) NOT NULL, lesson_uuid CHAR(32) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'viewed', last_opened_at DATETIME NOT NULL,
    completed_at DATETIME NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_neot_learning_progress_uuid (uuid),
    UNIQUE KEY uq_neot_learning_progress_student_lesson (student_email, lesson_uuid),
    KEY idx_neot_learning_progress_student_recent (student_email, last_opened_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  return learningProgressMigration;
}
