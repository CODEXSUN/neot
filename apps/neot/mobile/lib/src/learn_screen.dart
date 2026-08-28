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
  String? selectedSubjectUuid;

  @override
  Widget build(BuildContext context) {
    final subject = widget.snapshot.subjects
        .where((item) => item.uuid == selectedSubjectUuid)
        .firstOrNull;
    return subject == null ? _subjectOverview() : _lessonList(subject);
  }

  Widget _subjectOverview() => CustomScrollView(
    slivers: [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
        sliver: SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Subjects',
                style: Theme.of(context).textTheme.headlineLarge
                    ?.copyWith(fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 6),
              const Text('Choose a subject to view its lessons.'),
            ],
          ),
        ),
      ),
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        sliver: SliverGrid.builder(
          itemCount: widget.snapshot.subjects.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.12,
          ),
          itemBuilder: (context, index) {
            final subject = widget.snapshot.subjects[index];
            return _SubjectCard(
              subject: subject,
              lessons: _lessonsFor(subject),
              completed: _completedFor(subject),
              onTap: () => setState(() => selectedSubjectUuid = subject.uuid),
            );
          },
        ),
      ),
    ],
  );

  Widget _lessonList(Subject subject) {
    final lessons = _lessonsFor(subject);
    final completed = _completedFor(subject);
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () => setState(() => selectedSubjectUuid = null),
            icon: const Icon(Icons.arrow_back),
            label: const Text('All subjects'),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          subject.title,
          style: Theme.of(context).textTheme.headlineLarge
              ?.copyWith(fontWeight: FontWeight.w900),
        ),
        if (subject.description.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(subject.description),
        ],
        const SizedBox(height: 14),
        Text(
          '$completed of ${lessons.length} lessons complete',
          style: const TextStyle(
            color: Color(0xff4d7c0f),
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 18),
        ...lessons.map(
          (lesson) => ListTile(
            contentPadding: EdgeInsets.zero,
            leading: CircleAvatar(
              backgroundColor: const Color(0xffe8efe0),
              foregroundColor: const Color(0xff365314),
              child: Text('${lesson.position + 1}'),
            ),
            title: Text(lesson.title),
            subtitle: Text(
              _isCompleted(lesson) ? 'Completed' : 'Ready to learn',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => widget.openLesson(lesson),
          ),
        ),
      ],
    );
  }

  List<Lesson> _lessonsFor(Subject subject) => widget.snapshot.lessons
      .where((lesson) => lesson.subjectUuid == subject.uuid)
      .toList();

  int _completedFor(Subject subject) =>
      _lessonsFor(subject).where(_isCompleted).length;

  bool _isCompleted(Lesson lesson) => widget.snapshot.progress.any(
    (item) => item.lessonUuid == lesson.uuid && item.status == 'completed',
  );
}

class _SubjectCard extends StatelessWidget {
  const _SubjectCard({
    required this.subject,
    required this.lessons,
    required this.completed,
    required this.onTap,
  });

  final Subject subject;
  final List<Lesson> lessons;
  final int completed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final progress = lessons.isEmpty ? 0.0 : completed / lessons.length;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.auto_stories_outlined, color: Color(0xff365314)),
              const Spacer(),
              Text(
                subject.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 9),
              LinearProgressIndicator(value: progress, minHeight: 4),
              const SizedBox(height: 7),
              Text(
                '$completed/${lessons.length} complete',
                style: const TextStyle(color: Color(0xff596252), fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
