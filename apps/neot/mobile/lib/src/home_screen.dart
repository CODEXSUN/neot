import 'package:flutter/material.dart';

import 'learning_controller.dart';
import 'learn_screen.dart';
import 'lesson_screen.dart';
import 'models.dart';
import 'neot_logo.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.controller});
  final LearningController controller;
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int tab = 0;
  @override
  Widget build(BuildContext context) {
    final snapshot = widget.controller.snapshot!;
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            NeotLogo(size: 28),
            SizedBox(width: 10),
            Text('NEOT', style: TextStyle(fontWeight: FontWeight.w800)),
          ],
        ),
        actions: [
          IconButton(
            onPressed: widget.controller.signOut,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: IndexedStack(
        index: tab,
        children: [
          _Dashboard(snapshot: snapshot, open: _open),
          LearnScreen(snapshot: snapshot, openLesson: _open),
          _Progress(snapshot: snapshot),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab,
        onDestinationSelected: (value) => setState(() => tab = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book),
            label: 'Learn',
          ),
          NavigationDestination(
            icon: Icon(Icons.monitor_heart_outlined),
            selectedIcon: Icon(Icons.monitor_heart),
            label: 'Progress',
          ),
        ],
      ),
    );
  }

  Future<void> _open(Lesson lesson) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) =>
            LessonScreen(controller: widget.controller, lesson: lesson),
      ),
    );
    setState(() {});
  }
}

class _Dashboard extends StatelessWidget {
  const _Dashboard({required this.snapshot, required this.open});
  final LearningSnapshot snapshot;
  final ValueChanged<Lesson> open;
  @override
  Widget build(BuildContext context) {
    final completed = snapshot.progress
        .where((item) => item.status == 'completed')
        .toList();
    final next =
        snapshot.lessons
            .where(
              (lesson) =>
                  !completed.any((item) => item.lessonUuid == lesson.uuid),
            )
            .firstOrNull ??
        snapshot.lessons.first;
    final percent = snapshot.lessons.isEmpty
        ? 0
        : (completed.length * 100 / snapshot.lessons.length).round();
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'TODAY’S LEARNING',
          style: TextStyle(
            color: Color(0xff4d7c0f),
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Keep your momentum.',
          style: Theme.of(context).textTheme.headlineLarge
              ?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 8),
        const Text(
          'Read one lesson, check your skill, then unlock what comes next.',
        ),
        const SizedBox(height: 24),
        Card(
          color: const Color(0xff365314),
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'CONTINUE LEARNING',
                  style: TextStyle(
                    color: Color(0xffd9f99d),
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  next.title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 25,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 18),
                LinearProgressIndicator(value: percent / 100),
                const SizedBox(height: 9),
                Text(
                  '${completed.length} of ${snapshot.lessons.length} lessons complete',
                  style: const TextStyle(color: Color(0xffecfccb)),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xffa3e635),
                    foregroundColor: const Color(0xff1f2e0c),
                  ),
                  onPressed: () => open(next),
                  iconAlignment: IconAlignment.end,
                  icon: const Icon(Icons.arrow_forward),
                  label: const Text('Start lesson'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        Row(
          children: [
            _Metric('$percent%', 'Course progress'),
            _Metric(
              '${snapshot.attempts.where((item) => item.passed).length}',
              'Quizzes passed',
            ),
            _Metric(
              '${snapshot.attempts.where((item) => !item.passed).length}',
              'To retry',
            ),
          ],
        ),
        const SizedBox(height: 24),
        Text(
          'Recent lessons',
          style: Theme.of(context).textTheme.titleLarge
              ?.copyWith(fontWeight: FontWeight.w800),
        ),
        ...snapshot.progress.take(3).map((progress) {
          final lesson = snapshot.lessons
              .where((item) => item.uuid == progress.lessonUuid)
              .firstOrNull;
          return lesson == null
              ? const SizedBox.shrink()
              : ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(lesson.title),
                  subtitle: Text(
                    progress.status == 'completed'
                        ? 'Quiz passed'
                        : 'Ready to continue',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => open(lesson),
                );
        }),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.value, this.label);
  final String value, label;
  @override
  Widget build(BuildContext context) => Expanded(
    child: Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 4),
        child: Column(
          children: [
            Text(
              value,
              style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 5),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11, color: Colors.black54),
            ),
          ],
        ),
      ),
    ),
  );
}

class _Progress extends StatelessWidget {
  const _Progress({required this.snapshot});
  final LearningSnapshot snapshot;
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(20),
    children: [
      Text(
        'Learning progress',
        style: Theme.of(context).textTheme.headlineLarge
            ?.copyWith(fontWeight: FontWeight.w900),
      ),
      const SizedBox(height: 18),
      Card(
        color: const Color(0xff365314),
        child: Padding(
          padding: const EdgeInsets.all(22),
          child: Text(
            '${snapshot.progress.where((item) => item.status == 'completed').length}/${snapshot.lessons.length}\nLessons complete',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 24,
              height: 1.5,
            ),
          ),
        ),
      ),
      const SizedBox(height: 18),
      Text(
        'Quiz status',
        style: Theme.of(context).textTheme.titleLarge
            ?.copyWith(fontWeight: FontWeight.w800),
      ),
      ...snapshot.tests.take(15).map((test) {
        final attempt = snapshot.attempts
            .where((item) => item.testUuid == test.uuid)
            .firstOrNull;
        return ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(test.title),
          subtitle: Text(
            attempt == null
                ? 'Not attempted'
                : '${attempt.percentage.round()}% score',
          ),
          trailing: Chip(
            label: Text(
              attempt?.passed == true
                  ? 'Passed'
                  : attempt == null
                  ? 'Ready'
                  : 'Retry',
            ),
          ),
        );
      }),
    ],
  );
}
