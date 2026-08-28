import 'package:flutter/material.dart';

import 'learning_controller.dart';
import 'models.dart';

class QAndAScreen extends StatelessWidget {
  const QAndAScreen({super.key, required this.controller});
  final LearningController controller;

  @override
  Widget build(BuildContext context) {
    final snapshot = controller.snapshot!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
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
                    'Q & A',
                    style: Theme.of(context).textTheme.headlineLarge
                        ?.copyWith(fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 7),
                  const Text('Ask, answer, and learn together.'),
                ],
              ),
            ),
            IconButton.filled(
              onPressed: () => _ask(context, snapshot),
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Ask question',
            ),
          ],
        ),
        const SizedBox(height: 22),
        if (snapshot.learningQuestions.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 48),
            child: Center(
              child: Text('No questions yet. Start the discussion.'),
            ),
          ),
        ...snapshot.learningQuestions.map(
          (question) => _QuestionThread(
            question: question,
            lesson: snapshot.lessons
                .where((item) => item.uuid == question.lessonUuid)
                .firstOrNull,
            answers: snapshot.answers
                .where((item) => item.questionUuid == question.uuid)
                .toList(),
            onReply: () => _reply(context, question),
          ),
        ),
      ],
    );
  }

  Future<void> _ask(BuildContext context, LearningSnapshot snapshot) async {
    if (snapshot.lessons.isEmpty) return;
    var lesson = snapshot.lessons.first;
    final text = TextEditingController();
    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.fromLTRB(
          20,
          20,
          20,
          MediaQuery.viewInsetsOf(context).bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Ask a question',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<Lesson>(
              initialValue: lesson,
              items: snapshot.lessons
                  .map(
                    (item) => DropdownMenuItem(
                      value: item,
                      child: Text(item.title, overflow: TextOverflow.ellipsis),
                    ),
                  )
                  .toList(),
              onChanged: (value) => lesson = value ?? lesson,
              decoration: const InputDecoration(
                labelText: 'Lesson',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: text,
              autofocus: true,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Question',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Post question'),
              ),
            ),
          ],
        ),
      ),
    );
    if (submitted == true && text.text.trim().isNotEmpty) {
      await controller.api.askQuestion(lesson.uuid, text.text.trim());
      await controller.refresh();
    }
  }

  Future<void> _reply(BuildContext context, LearningQuestion question) async {
    final text = TextEditingController();
    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Write an answer'),
        content: TextField(
          controller: text,
          autofocus: true,
          maxLines: 4,
          decoration: const InputDecoration(hintText: 'Share a clear answer…'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Post answer'),
          ),
        ],
      ),
    );
    if (submitted == true && text.text.trim().isNotEmpty) {
      await controller.api.answerQuestion(question.uuid, text.text.trim());
      await controller.refresh();
    }
  }
}

class _QuestionThread extends StatelessWidget {
  const _QuestionThread({
    required this.question,
    required this.lesson,
    required this.answers,
    required this.onReply,
  });
  final LearningQuestion question;
  final Lesson? lesson;
  final List<LearningAnswer> answers;
  final VoidCallback onReply;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        lesson?.title ?? 'Learning discussion',
        style: const TextStyle(
          color: Color(0xff4d7c0f),
          fontWeight: FontWeight.w700,
        ),
      ),
      const SizedBox(height: 6),
      Text(
        question.text,
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
      ),
      const SizedBox(height: 5),
      Text(
        'Asked by ${question.askedBy}',
        style: const TextStyle(color: Color(0xff687164)),
      ),
      ...answers.map(
        (answer) => Padding(
          padding: const EdgeInsets.fromLTRB(18, 14, 0, 0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(
                answer.accepted
                    ? Icons.check_circle_outline
                    : Icons.chat_bubble_outline,
                size: 19,
                color: const Color(0xff4d7c0f),
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(answer.text),
                    const SizedBox(height: 3),
                    Text(
                      answer.answeredBy,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xff687164),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      Align(
        alignment: Alignment.centerLeft,
        child: TextButton.icon(
          onPressed: onReply,
          icon: const Icon(Icons.reply),
          label: const Text('Answer'),
        ),
      ),
      const Divider(height: 28),
    ],
  );
}
