import 'package:flutter/material.dart';

import 'neot_logo.dart';
import 'update_service.dart';

class UpdateBanner extends StatelessWidget {
  const UpdateBanner({super.key, required this.update, required this.onTap});

  final AppUpdate update;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: const Color(0xffecfccb),
    child: InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        child: Row(
          children: [
            const Icon(Icons.system_update_alt, color: Color(0xff365314)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'NEOT ${update.versionName} is available',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const Text('Tap to download and install'),
                ],
              ),
            ),
            const Icon(Icons.chevron_right),
          ],
        ),
      ),
    ),
  );
}

class UpdateMenu extends StatelessWidget {
  const UpdateMenu({
    super.key,
    required this.checking,
    required this.onCheck,
    required this.onSignOut,
    required this.versionLabel,
  });

  final bool checking;
  final Future<void> Function() onCheck;
  final Future<void> Function() onSignOut;
  final Future<String> versionLabel;

  @override
  Widget build(BuildContext context) => Drawer(
    child: SafeArea(
      child: Column(
        children: [
          const ListTile(
            contentPadding: EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            leading: NeotLogo(size: 36),
            title: Text('NEOT', style: TextStyle(fontWeight: FontWeight.w800)),
            subtitle: Text('Learning companion'),
          ),
          const Divider(height: 1),
          ListTile(
            leading: checking
                ? const SizedBox.square(
                    dimension: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.system_update_outlined),
            title: Text(
              checking ? 'Checking for updates…' : 'Check for updates',
            ),
            onTap: checking ? null : () => _check(context),
          ),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Sign out'),
            onTap: () => _signOut(context),
          ),
          const Spacer(),
          FutureBuilder<String>(
            future: versionLabel,
            builder: (context, snapshot) => Padding(
              padding: const EdgeInsets.all(20),
              child: Text(
                'NEOT ${snapshot.data ?? ''}',
                style: const TextStyle(color: Colors.black54, fontSize: 12),
              ),
            ),
          ),
        ],
      ),
    ),
  );

  Future<void> _check(BuildContext context) async {
    Navigator.pop(context);
    await onCheck();
  }

  Future<void> _signOut(BuildContext context) async {
    Navigator.pop(context);
    await onSignOut();
  }
}
