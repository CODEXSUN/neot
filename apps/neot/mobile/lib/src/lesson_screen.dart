import 'package:flutter/material.dart';

import 'learning_controller.dart';
import 'models.dart';

class LessonScreen extends StatefulWidget {
  const LessonScreen({
    super.key,
    required this.controller,
    required this.lesson,
  });
  final LearningController controller;
  final Lesson lesson;
  @override
  State<LessonScreen> createState() => _LessonScreenState();
}

class _LessonScreenState extends State<LessonScreen> {
  final answers = <String, String>{};
  Attempt? result;
  bool submitting = false;

  @override
  void initState() {
    super.initState();
    widget.controller.api.markViewed(widget.lesson.uuid);
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = widget.controller.snapshot!;
    final test = snapshot.tests
        .where((item) => item.lessonUuid == widget.lesson.uuid)
        .firstOrNull;
    final questions = snapshot.questions
        .where((item) => item.testUuid == test?.uuid)
        .toList();
    return Scaffold(
      appBar: AppBar(title: Text('Lesson ${widget.lesson.position + 1}')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            widget.lesson.title,
            style: Theme.of(context).textTheme.headlineLarge
                ?.copyWith(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          Text(
            'By ${widget.lesson.author}',
            style: const TextStyle(
              color: Color(0xff66705d),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 18),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Text(
                widget.lesson.content,
                style: const TextStyle(fontSize: 17, height: 1.65),
              ),
            ),
          ),
          const SizedBox(height: 22),
          Card(
            color: const Color(0xfff6f7f4),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'SKILL CHECK',
                    style: TextStyle(
                      color: Color(0xff4d7c0f),
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.1,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Test what you learned',
                    style: Theme.of(context).textTheme.headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 16),
                  ...questions.map(_question),
                  if (result != null) _Result(attempt: result!),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed:
                          submitting ||
                              questions.any(
                                (item) => answers[item.uuid] == null,
                              )
                          ? null
                          : () => _submit(test!, questions),
                      iconAlignment: IconAlignment.end,
                      icon: Icon(
                        result?.passed == true
                            ? Icons.arrow_forward
                            : Icons.check,
                      ),
                      label: Padding(
                        padding: const EdgeInsets.all(13),
                        child: Text(
                          result?.passed == true
                              ? 'Continue to next lesson'
                              : submitting
                              ? 'Checking…'
                              : 'Check my skill',
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _question(QuizQuestion question) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        question.prompt,
        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
      ),
      RadioGroup<String>(
        groupValue: answers[question.uuid],
        onChanged: (value) => setState(() => answers[question.uuid] = value!),
        child: Column(
          children: question.options
              .map(
                (option) => Card(
                  child: RadioListTile<String>(
                    value: option,
                    title: Text(option),
                  ),
                ),
              )
              .toList(),
        ),
      ),
      const SizedBox(height: 10),
    ],
  );

  Future<void> _submit(LearningTest test, List<QuizQuestion> questions) async {
    if (result?.passed == true) {
      _openNext();
      return;
    }
    setState(() => submitting = true);
    try {
      final attempt = await widget.controller.api.submitQuiz(
        test.uuid,
        answers,
      );
      await widget.controller.refresh();
      if (mounted) setState(() => result = attempt);
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  void _openNext() {
    final lessons = widget.controller.snapshot!.lessons;
    final index = lessons.indexWhere((item) => item.uuid == widget.lesson.uuid);
    if (index >= 0 && index + 1 < lessons.length) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => LessonScreen(
            controller: widget.controller,
            lesson: lessons[index + 1],
          ),
        ),
      );
    } else {
      Navigator.of(context).pop();
    }
  }
}

class _Result extends StatelessWidget {
  const _Result({required this.attempt});
  final Attempt attempt;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(top: 12),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: attempt.passed ? const Color(0xffecfccb) : const Color(0xfffff1f2),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(
      children: [
        Icon(
          attempt.passed ? Icons.check_circle : Icons.replay,
          color: attempt.passed ? const Color(0xff4d7c0f) : Colors.red,
        ),
        const SizedBox(width: 10),
        Text(
          '${attempt.passed ? 'Lesson complete' : 'Review and try again'}\n${attempt.percentage.round()}% score',
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ],
    ),
  );
}
