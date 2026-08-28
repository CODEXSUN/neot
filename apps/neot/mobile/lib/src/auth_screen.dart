import 'package:flutter/material.dart';

import 'learning_controller.dart';
import 'neot_logo.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.controller});

  final LearningController controller;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final email = TextEditingController();
  final name = TextEditingController();
  final password = TextEditingController();
  final formKey = GlobalKey<FormState>();
  bool registering = false;
  String role = 'student';

  @override
  void dispose() {
    email.dispose();
    name.dispose();
    password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 28),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Form(
              key: formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Center(child: NeotLogo(size: 72)),
                  const SizedBox(height: 12),
                  const Text(
                    'NEOT',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Color(0xff365314),
                      fontSize: 23,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2.2,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    registering ? 'Create your account' : 'Welcome back',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 20),
                  SegmentedButton<bool>(
                    segments: const [
                      ButtonSegment(value: false, label: Text('Sign in')),
                      ButtonSegment(value: true, label: Text('Register')),
                    ],
                    selected: {registering},
                    showSelectedIcon: false,
                    onSelectionChanged: (value) => setState(() {
                      registering = value.first;
                      widget.controller.error = null;
                    }),
                  ),
                  const SizedBox(height: 20),
                  if (registering) ...[
                    TextFormField(
                      controller: name,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        labelText: 'Full name',
                      ),
                      validator: (value) => (value?.trim().length ?? 0) < 2
                          ? 'Enter your full name.'
                          : null,
                    ),
                    const SizedBox(height: 14),
                  ],
                  TextFormField(
                    controller: email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      labelText: 'Email',
                    ),
                    validator: (value) => !(value?.contains('@') ?? false)
                        ? 'Enter a valid email.'
                        : null,
                  ),
                  const SizedBox(height: 14),
                  TextFormField(
                    controller: password,
                    obscureText: true,
                    autofillHints: [
                      registering
                          ? AutofillHints.newPassword
                          : AutofillHints.password,
                    ],
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      labelText: 'Password',
                    ),
                    validator: (value) => (value?.length ?? 0) < 8
                        ? 'Use at least 8 characters.'
                        : null,
                  ),
                  if (registering) ...[
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      initialValue: role,
                      decoration: const InputDecoration(
                        border: OutlineInputBorder(),
                        labelText: 'Register as',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'student',
                          child: Text('Student'),
                        ),
                        DropdownMenuItem(
                          value: 'master',
                          child: Text('Master'),
                        ),
                      ],
                      onChanged: (value) => role = value ?? 'student',
                    ),
                  ],
                  if (widget.controller.error != null) ...[
                    const SizedBox(height: 14),
                    Text(
                      widget.controller.error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.red),
                    ),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: widget.controller.loading ? null : submit,
                    child: Text(
                      registering ? 'Create account' : 'Sign in',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  );

  Future<void> submit() async {
    if (!(formKey.currentState?.validate() ?? false)) return;
    if (registering) {
      await widget.controller.register(
        email: email.text.trim(),
        name: name.text.trim(),
        password: password.text,
        role: role,
      );
      return;
    }
    await widget.controller.login(email.text.trim(), password.text);
  }
}
