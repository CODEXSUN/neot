import 'package:flutter/material.dart';

import 'models.dart';

class LearnScreen extends StatefulWidget {
  const LearnScreen({
    super.key,
    required this.snapshot,
    required this.openLesson,
  });
  final LearningSnapshot snapshot;
  final ValueChanged<Lesson> openLesson;
  @override
  State<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends State<LearnScreen> {
  String? courseUuid;
  String? subjectUuid;

  @override
  Widget build(BuildContext context) {
    final course = widget.snapshot.courses
        .where((item) => item.uuid == courseUuid)
        .firstOrNull;
    final subject = widget.snapshot.subjects
        .where((item) => item.uuid == subjectUuid)
        .firstOrNull;
    if (subject != null) return _lessons(subject);
    if (course != null) return _subjects(course);
    return _courses();
  }

  Widget _courses() => ListView(
    padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
    children: [
      _header(
        'Courses',
        'Choose a course and follow its complete learning path.',
      ),
      const SizedBox(height: 22),
      ...widget.snapshot.courses.map((course) {
        final subjects = _subjectsFor(course);
        final lessons = subjects.expand(_lessonsFor).toList();
        return _CourseCard(
          course: course,
          subjects: subjects.length,
          lessons: lessons.length,
          completed: lessons.where(_isCompleted).length,
          onTap: () => setState(() => courseUuid = course.uuid),
        );
      }),
    ],
  );

  Widget _subjects(Course course) => ListView(
    padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
    children: [
      _back('All courses', () => setState(() => courseUuid = null)),
      const SizedBox(height: 12),
      _header(course.title, course.description),
      const SizedBox(height: 22),
      ..._subjectsFor(course).map((subject) {
        final lessons = _lessonsFor(subject);
        return ListTile(
          contentPadding: const EdgeInsets.symmetric(vertical: 8),
          leading: const CircleAvatar(
            backgroundColor: Color(0xffe8efe0),
            foregroundColor: Color(0xff365314),
            child: Icon(Icons.auto_stories_outlined),
          ),
          title: Text(
            subject.title,
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
          subtitle: Text(
            '${lessons.length} lessons · ${lessons.where(_isCompleted).length} complete',
          ),
          trailing: const Icon(Icons.arrow_forward),
          onTap: () => setState(() => subjectUuid = subject.uuid),
        );
      }),
    ],
  );

  Widget _lessons(Subject subject) {
    final lessons = _lessonsFor(subject);
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
      children: [
        _back('Subjects', () => setState(() => subjectUuid = null)),
        const SizedBox(height: 12),
        _header(subject.title, subject.description),
        const SizedBox(height: 18),
        ...lessons.map(
          (lesson) => _LessonRow(
            lesson: lesson,
            completed: _isCompleted(lesson),
            onTap: () => widget.openLesson(lesson),
          ),
        ),
      ],
    );
  }

  Widget _header(String title, String description) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Text(
        'NEOT LEARNING',
        style: TextStyle(
          color: Color(0xff4d7c0f),
          fontWeight: FontWeight.w800,
          letterSpacing: 1.1,
        ),
      ),
      const SizedBox(height: 8),
      Text(
        title,
        style: Theme.of(context).textTheme.headlineLarge
            ?.copyWith(fontWeight: FontWeight.w900),
      ),
      if (description.isNotEmpty) ...[
        const SizedBox(height: 8),
        Text(description),
      ],
    ],
  );

  Widget _back(String label, VoidCallback onTap) => Align(
    alignment: Alignment.centerLeft,
    child: TextButton.icon(
      onPressed: onTap,
      icon: const Icon(Icons.arrow_back),
      label: Text(label),
    ),
  );
  List<Subject> _subjectsFor(Course course) => widget.snapshot.subjects
      .where((item) => item.courseUuid == course.uuid)
      .toList();
  List<Lesson> _lessonsFor(Subject subject) => widget.snapshot.lessons
      .where((item) => item.subjectUuid == subject.uuid)
      .toList();
  bool _isCompleted(Lesson lesson) => widget.snapshot.progress.any(
    (item) => item.lessonUuid == lesson.uuid && item.status == 'completed',
  );
}

class _CourseCard extends StatelessWidget {
  const _CourseCard({
    required this.course,
    required this.subjects,
    required this.lessons,
    required this.completed,
    required this.onTap,
  });
  final Course course;
  final int subjects, lessons, completed;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(22),
            color: const Color(0xffcef5df),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.auto_awesome_outlined, color: Color(0xff174c3b)),
                SizedBox(height: 34),
                Text(
                  'Learn something that changes tomorrow.',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  course.code,
                  style: const TextStyle(
                    color: Color(0xff687164),
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  course.title,
                  style: const TextStyle(
                    color: Color(0xff3f7205),
                    fontSize: 21,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                Text(course.description),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Text(
                      '${_count(subjects, 'subject')} · ${_count(lessons, 'lesson')}',
                    ),
                    const Spacer(),
                    Text('$completed complete'),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );

  static String _count(int value, String label) =>
      '$value $label${value == 1 ? '' : 's'}';
}

class _LessonRow extends StatelessWidget {
  const _LessonRow({
    required this.lesson,
    required this.completed,
    required this.onTap,
  });
  final Lesson lesson;
  final bool completed;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: const EdgeInsets.symmetric(vertical: 8),
    leading: CircleAvatar(
      backgroundColor: completed
          ? const Color(0xffdcfce7)
          : const Color(0xffede9fe),
      foregroundColor: completed
          ? const Color(0xff166534)
          : const Color(0xff5b21b6),
      child: Text(
        '${lesson.position + 1}',
        style: const TextStyle(fontWeight: FontWeight.w900),
      ),
    ),
    title: Text(
      lesson.title,
      style: const TextStyle(fontWeight: FontWeight.w800),
    ),
    subtitle: Text(completed ? 'Completed' : 'Ready to read'),
    trailing: const Icon(Icons.arrow_forward),
    onTap: onTap,
  );
}
