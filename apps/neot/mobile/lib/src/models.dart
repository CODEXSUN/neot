class Subject {
  const Subject({
    required this.uuid,
    required this.courseUuid,
    required this.title,
    required this.description,
    required this.position,
  });

  factory Subject.fromJson(Map<String, dynamic> json) => Subject(
    uuid: json['uuid'] as String,
    courseUuid: json['courseUuid'] as String,
    title: json['title'] as String,
    description: json['description'] as String? ?? '',
    position: _number(json['position']).toInt(),
  );

  final String uuid, courseUuid, title, description;
  final int position;
}

class Lesson {
  const Lesson({
    required this.uuid,
    required this.subjectUuid,
    required this.title,
    required this.content,
    required this.position,
  });
  factory Lesson.fromJson(Map<String, dynamic> json) => Lesson(
    uuid: json['uuid'] as String,
    subjectUuid: json['subjectUuid'] as String,
    title: json['title'] as String,
    content: json['content'] as String? ?? '',
    position: _number(json['position']).toInt(),
  );
  final String uuid, subjectUuid, title, content;
  final int position;
}

class LearningTest {
  const LearningTest({
    required this.uuid,
    required this.lessonUuid,
    required this.title,
  });
  factory LearningTest.fromJson(Map<String, dynamic> json) => LearningTest(
    uuid: json['uuid'] as String,
    lessonUuid: json['lessonUuid'] as String?,
    title: json['title'] as String,
  );
  final String uuid, title;
  final String? lessonUuid;
}

class QuizQuestion {
  const QuizQuestion({
    required this.uuid,
    required this.testUuid,
    required this.prompt,
    required this.options,
  });
  factory QuizQuestion.fromJson(Map<String, dynamic> json) => QuizQuestion(
    uuid: json['uuid'] as String,
    testUuid: json['testUuid'] as String,
    prompt: json['prompt'] as String,
    options: (json['options'] as List<dynamic>).cast<String>(),
  );
  final String uuid, testUuid, prompt;
  final List<String> options;
}

class Attempt {
  const Attempt({
    required this.testUuid,
    required this.percentage,
    required this.passed,
  });
  factory Attempt.fromJson(Map<String, dynamic> json) => Attempt(
    testUuid: json['testUuid'] as String,
    percentage: _number(json['percentage']).toDouble(),
    passed:
        json['passed'] == true || json['passed'] == 1 || json['passed'] == '1',
  );
  final String testUuid;
  final double percentage;
  final bool passed;
}

class LessonProgress {
  const LessonProgress({
    required this.lessonUuid,
    required this.status,
    required this.lastOpenedAt,
  });
  factory LessonProgress.fromJson(Map<String, dynamic> json) => LessonProgress(
    lessonUuid: json['lessonUuid'] as String,
    status: json['status'] as String,
    lastOpenedAt: DateTime.parse(json['lastOpenedAt'] as String),
  );
  final String lessonUuid, status;
  final DateTime lastOpenedAt;
}

class LearningSnapshot {
  const LearningSnapshot({
    required this.subjects,
    required this.lessons,
    required this.tests,
    required this.questions,
    required this.attempts,
    required this.progress,
  });
  factory LearningSnapshot.fromJson(Map<String, dynamic> json) =>
      LearningSnapshot(
        subjects: _items(json, 'subjects', Subject.fromJson),
        lessons: _items(json, 'lessons', Lesson.fromJson),
        tests: _items(json, 'tests', LearningTest.fromJson),
        questions: _items(json, 'quizQuestions', QuizQuestion.fromJson),
        attempts: _items(json, 'attempts', Attempt.fromJson),
        progress: _items(json, 'progress', LessonProgress.fromJson),
      );
  final List<Subject> subjects;
  final List<Lesson> lessons;
  final List<LearningTest> tests;
  final List<QuizQuestion> questions;
  final List<Attempt> attempts;
  final List<LessonProgress> progress;
}

List<T> _items<T>(
  Map<String, dynamic> json,
  String key,
  T Function(Map<String, dynamic>) parse,
) => (json[key] as List<dynamic>? ?? [])
    .map((item) => parse(item as Map<String, dynamic>))
    .toList();

num _number(dynamic value) =>
    value is num ? value : num.tryParse('$value') ?? 0;
