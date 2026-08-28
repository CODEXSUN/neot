import 'package:flutter_test/flutter_test.dart';
import 'package:neot_mobile/src/models.dart';

void main() {
  test('parses the student learning snapshot', () {
    final snapshot = LearningSnapshot.fromJson({
      'subjects': [
        {
          'uuid': 'subject-1',
          'courseUuid': 'course-1',
          'title': 'HTML Foundations',
          'description': 'Build accessible page structures.',
          'position': 0,
        },
      ],
      'lessons': [
        {
          'uuid': 'lesson-1',
          'subjectUuid': 'subject-1',
          'title': 'HTML Introduction',
          'content': 'Start with the document structure.',
          'position': 0,
        },
      ],
      'tests': <dynamic>[],
      'quizQuestions': <dynamic>[],
      'attempts': <dynamic>[],
      'progress': <dynamic>[],
    });

    expect(snapshot.lessons.single.title, 'HTML Introduction');
    expect(snapshot.subjects.single.title, 'HTML Foundations');
  });
}
