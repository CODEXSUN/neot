# NEOT Learning Model

NEOT serves organisations, masters, and students.

An organisation owns courses and classes. A master teaches a class. A student enrolls in a course
and attends a class.

## Learning hierarchy

1. An organisation owns one or more courses.
2. A course contains subjects.
3. A subject contains lessons.
4. A lesson contains questions.
5. An answer belongs to one question.

Classes connect masters and students to course delivery. Tests belong to a course or lesson. Quiz
attempts record scores and pass results.

## Persistence ownership

The learning API owns dedicated MariaDB tables for these records:

- Courses and classes.
- Course and class enrollments.
- Subjects, lessons, questions, and answers.
- Tests, quiz questions, and attempts.
- Lesson progress.

The module does not store LMS records in Project Manager tables.

## Access direction

- Organisation administrators manage identity, courses, classes, and master assignments.
- Masters manage subjects, lessons, answers, tests, and class delivery.
- Students view enrolled courses, attend classes, ask questions, and complete quizzes.

The current identity roles remain the access source. A later migration can add organisation
membership and detailed permission tables.

## Local runtime

- API: `http://127.0.0.1:9250`
- Web: `http://127.0.0.1:9260`
- Desktop development app: `http://127.0.0.1:1620`
