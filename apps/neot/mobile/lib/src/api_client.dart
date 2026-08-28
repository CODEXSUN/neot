import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'models.dart';

class ApiClient {
  ApiClient({this.baseUrl = 'http://10.0.2.2:9250'});
  final String baseUrl;
  String? _token;

  Future<bool> restoreSession() async {
    _token = (await SharedPreferences.getInstance()).getString('neot_session');
    return _token != null;
  }

  Future<String> login(String email, String password) async {
    final data = await _request(
      '/auth/login',
      method: 'POST',
      body: {'email': email, 'password': password},
    );
    return _saveSession(data);
  }

  Future<String> register({
    required String email,
    required String name,
    required String password,
    required String role,
  }) async {
    final data = await _request(
      '/auth/register',
      method: 'POST',
      body: {'email': email, 'name': name, 'password': password, 'role': role},
    );
    return _saveSession(data);
  }

  Future<String> _saveSession(Map<String, dynamic> data) async {
    _token = data['accessToken'] as String;
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString('neot_session', _token!);
    final role = data['role'] as String;
    await preferences.setString('neot_role', role);
    return role;
  }

  Future<LearningSnapshot> snapshot() async =>
      LearningSnapshot.fromJson(await _request('/api/neot/learning/snapshot'));
  Future<void> markViewed(String lessonUuid) async {
    await _request(
      '/api/neot/learning/lessons/$lessonUuid/progress',
      method: 'PUT',
      body: const {'status': 'viewed'},
    );
  }

  Future<void> askQuestion(String lessonUuid, String text) async {
    await _request(
      '/api/neot/learning/questions',
      method: 'POST',
      body: {'lessonUuid': lessonUuid, 'questionText': text},
    );
  }

  Future<void> answerQuestion(String questionUuid, String text) async {
    await _request(
      '/api/neot/learning/answers',
      method: 'POST',
      body: {'questionUuid': questionUuid, 'answerText': text},
    );
  }

  Future<Attempt> submitQuiz(
    String testUuid,
    Map<String, String> answers,
  ) async => Attempt.fromJson(
    await _request(
      '/api/neot/learning/tests/$testUuid/attempts',
      method: 'POST',
      body: {'answers': answers},
    ),
  );
  Future<void> signOut() async {
    _token = null;
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove('neot_session');
    await preferences.remove('neot_role');
  }

  Future<Map<String, dynamic>> _request(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? body,
  }) async {
    final request = http.Request(method, Uri.parse('$baseUrl$path'))
      ..headers.addAll({
        'Accept': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
        if (body != null) 'Content-Type': 'application/json',
      });
    if (body != null) request.body = jsonEncode(body);
    final response = await request.send();
    final decoded = jsonDecode(
      await response.stream.bytesToString(),
    ) as Map<String, dynamic>;
    if (response.statusCode >= 400 || decoded['success'] != true) {
      throw ApiException(
        (decoded['error'] as Map<String, dynamic>?)?['message'] as String? ??
            'Request failed.',
      );
    }
    return decoded['data'] as Map<String, dynamic>;
  }
}

class ApiException implements Exception {
  const ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}
