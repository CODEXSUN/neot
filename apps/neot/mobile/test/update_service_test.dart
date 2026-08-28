import 'package:flutter_test/flutter_test.dart';
import 'package:neot_mobile/src/update_service.dart';

void main() {
  test('parses a relative APK URL from the release manifest', () {
    final update = AppUpdate.fromJson({
      'versionCode': 2,
      'versionName': '1.0.1',
      'apkUrl': '/storage/mobile/release/neot-mobile.apk',
      'sha256': 'ABC123',
      'sizeBytes': 1024,
      'releaseNotes': ['Subject-first learning'],
      'required': false,
    }, Uri.parse('https://neot.in/storage/mobile/release/update.json'));

    expect(
      update.apkUri,
      Uri.parse('https://neot.in/storage/mobile/release/neot-mobile.apk'),
    );
    expect(update.sha256Digest, 'abc123');
    expect(update.versionCode, 2);
  });
}
