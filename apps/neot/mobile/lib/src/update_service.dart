import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

class AppUpdate {
  const AppUpdate({
    required this.versionCode,
    required this.versionName,
    required this.apkUri,
    required this.sha256Digest,
    required this.sizeBytes,
    required this.releaseNotes,
    required this.required,
  });

  factory AppUpdate.fromJson(Map<String, dynamic> json, Uri manifestUri) {
    final apkUrl = json['apkUrl'] as String;
    return AppUpdate(
      versionCode: (json['versionCode'] as num).toInt(),
      versionName: json['versionName'] as String,
      apkUri: manifestUri.resolve(apkUrl),
      sha256Digest: (json['sha256'] as String).toLowerCase(),
      sizeBytes: (json['sizeBytes'] as num).toInt(),
      releaseNotes: (json['releaseNotes'] as List<dynamic>).cast<String>(),
      required: json['required'] == true,
    );
  }

  final int versionCode, sizeBytes;
  final String versionName, sha256Digest;
  final Uri apkUri;
  final List<String> releaseNotes;
  final bool required;
}

class UpdateService {
  UpdateService({http.Client? client}) : _client = client ?? http.Client();

  static const manifestUrl = String.fromEnvironment(
    'NEOT_UPDATE_MANIFEST_URL',
    defaultValue: 'https://neot.in/storage/mobile/release/update.json',
  );
  static const _channel = MethodChannel('in.neot.mobile/update');

  final http.Client _client;

  Future<String> currentVersionLabel() async {
    final appInfo = await _channel.invokeMapMethod<String, dynamic>('appInfo');
    final versionName = appInfo?['versionName'] as String?;
    return versionName == null ? 'Version unavailable' : 'v$versionName';
  }

  Future<AppUpdate?> check() async {
    final appInfo = await _channel.invokeMapMethod<String, dynamic>('appInfo');
    final currentVersionCode = (appInfo?['versionCode'] as num).toInt();
    final manifestUri = Uri.parse(manifestUrl).replace(
      queryParameters: {
        'checkedAt': DateTime.now().millisecondsSinceEpoch.toString(),
      },
    );
    final response = await _client
        .get(manifestUri)
        .timeout(const Duration(seconds: 8));
    if (response.statusCode != HttpStatus.ok) {
      throw const HttpException('The update service is unavailable.');
    }
    final update = AppUpdate.fromJson(
      jsonDecode(response.body) as Map<String, dynamic>,
      Uri.parse(manifestUrl),
    );
    return update.versionCode > currentVersionCode ? update : null;
  }

  Future<String> download(
    AppUpdate update, {
    required ValueChanged<double> onProgress,
  }) async {
    final path = await _channel.invokeMethod<String>('downloadPath');
    if (path == null) {
      throw const FileSystemException('Update path is unavailable.');
    }

    final request = http.Request('GET', update.apkUri);
    final response = await _client
        .send(request)
        .timeout(const Duration(seconds: 15));
    if (response.statusCode != HttpStatus.ok) {
      throw const HttpException('The update could not be downloaded.');
    }

    final file = File(path);
    final output = file.openWrite();
    final digest = Completer<Digest>();
    final digestSink = sha256.startChunkedConversion(
      _DigestSink(digest.complete),
    );
    var received = 0;
    try {
      await for (final chunk in response.stream) {
        output.add(chunk);
        digestSink.add(chunk);
        received += chunk.length;
        onProgress(received / update.sizeBytes);
      }
      await output.flush();
    } finally {
      await output.close();
      digestSink.close();
    }

    final actualDigest = (await digest.future).toString().toLowerCase();
    if (received != update.sizeBytes || actualDigest != update.sha256Digest) {
      await file.delete().catchError((_) => file);
      throw const FormatException(
        'The downloaded update did not pass verification.',
      );
    }
    return path;
  }

  Future<bool> canInstall() async =>
      await _channel.invokeMethod<bool>('canInstall') ?? false;

  Future<String?> install(String path) =>
      _channel.invokeMethod<String>('installApk', {'path': path});

  void close() => _client.close();
}

class _DigestSink implements Sink<Digest> {
  const _DigestSink(this.onDigest);

  final ValueChanged<Digest> onDigest;

  @override
  void add(Digest data) => onDigest(data);

  @override
  void close() {}
}
