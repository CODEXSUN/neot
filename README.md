# NEOT

**Learn today. Own tomorrow.**

NEOT is an organisation-based learning platform for students and masters. It connects structured
learning, student welfare, questions, answers, and skill development in one workspace.

The project targets [neot.in](https://neot.in).

## Goal

NEOT helps an organisation create a learning environment where each student can grow with clear
guidance and support.

The project has five goals:

1. Give students a clear path from a class to a subject and lesson.
2. Give masters a direct way to teach, answer, guide, and review progress.
3. Give organisations a shared view of learning activity and responsibility.
4. Treat welfare and mentoring as part of the learning record.
5. Track practical skill growth with goals, evidence, and feedback.

## Brand

NEOT means **Next Era. Own Tomorrow.**

The **NEOT Portal** is a modern, name-led symbol. A continuous `N` sits between two open portal
corners. The mark represents movement from learning today to owning tomorrow.

The logo is a one-colour SVG. See [the brand guide](assist/documentation/BRAND.md) for usage rules.

## Learning model

The LMS uses this curriculum hierarchy:

```text
Organisation
└── Course
    └── Subject
        └── Lesson
            └── Question
                └── Answer
```

Classes provide scheduled course delivery. Masters teach classes. Students enroll in courses and
attend classes. Tests belong to a course or lesson. Quiz attempts provide performance results.

The learning module owns its MariaDB tables, API routes, and React workspace. It does not use the
Project Manager data model.

See [the learning model](assist/architecture/learning-model.md) for the compatibility mapping and
access direction.

## Current product areas

- Dashboard for learning status and open needs.
- Classes, subjects, and lessons for structured learning.
- Questions and answers for student support.
- Tests and quizzes for measured learning.
- Performance summaries for attempts, averages, best scores, and pass results.
- Ideas for shared improvement discussions.
- Messenger for student, master, and organisation communication.
- Existing content, file, planning, and administration modules.

## Architecture

NEOT uses Node.js, TypeScript, and React for the web platform. It uses Flutter for mobile.

- `apps/platform/api` owns authentication, identity, server startup, and database composition.
- `apps/platform/web` owns the application shell and login surfaces.
- `apps/neot/api` owns NEOT API modules and MariaDB persistence.
- `apps/neot/web` owns NEOT learning and collaboration workspaces.
- `apps/neot/desktop` owns the Tauri desktop application.
- `apps/neot/mobile` owns the native Flutter application for Android and future mobile targets.
- `packages/framework` contains shared backend contracts.
- `packages/ui` contains shared interface components.

## Local development

Requirements:

- Node.js 26.5 or later.
- npm 12 or later.
- MariaDB configured through `.env`.
- Flutter 3 with Dart 3.13 or later for mobile development.
- The Android SDK for Android builds and emulator use.

Install and start the application:

```powershell
npm.cmd install
npm.cmd run dev
```

Local services:

- API: `http://127.0.0.1:9250`
- Web: `http://127.0.0.1:9260`
- Desktop Vite service: `http://127.0.0.1:1620`

Copy `.env.example` to `.env` before the first start. Set the database and administrator values in
the local file. Do not commit secrets.

## Verification

Run the repository checks:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run check:deployment
npm.cmd run check:repository-boundary
npm.cmd run check:module-boundaries
npm.cmd run check:database-lifecycle
```

Live verification must cover login, the dashboard, learning routes, record creation, Ideas, and
Messenger. Static checks do not prove database or browser behaviour.

## Product direction

The next data slice should add organisation memberships, role permissions, attendance records,
welfare privacy controls, and skill evidence attachments.
