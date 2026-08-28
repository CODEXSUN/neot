import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'models.dart';

class LearningController extends ChangeNotifier {
  LearningController(this.api);
  final ApiClient api;
  LearningSnapshot? snapshot;
  bool loading = true, signedIn = false;
  String? role;
  String? error;

  Future<void> initialize() async {
    signedIn = await api.restoreSession();
    if (signedIn) {
      await refresh();
    } else {
      loading = false;
    }
    notifyListeners();
  }

  Future<void> login(String email, String password) => _run(() async {
    role = await api.login(email, password);
    final loadedSnapshot = await api.snapshot();
    snapshot = loadedSnapshot;
    signedIn = true;
  });
  Future<void> register({
    required String email,
    required String name,
    required String password,
    required String role,
  }) => _run(() async {
    this.role = await api.register(
      email: email,
      name: name,
      password: password,
      role: role,
    );
    snapshot = await api.snapshot();
    signedIn = true;
  });
  Future<void> refresh() => _run(() async {
    snapshot = await api.snapshot();
  });
  Future<void> signOut() async {
    await api.signOut();
    signedIn = false;
    snapshot = null;
    role = null;
    notifyListeners();
  }

  Future<void> _run(Future<void> Function() action) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      await action();
    } catch (cause) {
      error = cause.toString();
    }
    loading = false;
    notifyListeners();
  }
}
