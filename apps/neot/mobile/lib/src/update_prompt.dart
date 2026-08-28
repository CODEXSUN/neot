import 'package:flutter/material.dart';

import 'update_service.dart';

Future<void> showUpdatePrompt(
  BuildContext context,
  AppUpdate update,
  UpdateService service,
) => showDialog<void>(
  context: context,
  barrierDismissible: !update.required,
  builder: (_) => _UpdateDialog(update: update, service: service),
);

class _UpdateDialog extends StatefulWidget {
  const _UpdateDialog({required this.update, required this.service});

  final AppUpdate update;
  final UpdateService service;

  @override
  State<_UpdateDialog> createState() => _UpdateDialogState();
}

class _UpdateDialogState extends State<_UpdateDialog>
    with WidgetsBindingObserver {
  double progress = 0;
  bool downloading = false;
  String? downloadedPath, error, status;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && downloadedPath != null) {
      _continueAfterPermission();
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    icon: const Icon(
      Icons.system_update_alt,
      color: Color(0xff365314),
      size: 34,
    ),
    title: Text('NEOT ${widget.update.versionName} is ready'),
    content: SizedBox(
      width: 360,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ...widget.update.releaseNotes.map(
            (note) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text('• $note'),
            ),
          ),
          if (downloading) ...[
            const SizedBox(height: 12),
            LinearProgressIndicator(value: progress.clamp(0, 1)),
            const SizedBox(height: 8),
            Text('${(progress * 100).clamp(0, 100).round()}% downloaded'),
          ],
          if (status != null) ...[
            const SizedBox(height: 12),
            Text(status!, style: const TextStyle(color: Color(0xff596252))),
          ],
          if (error != null) ...[
            const SizedBox(height: 12),
            Text(error!, style: const TextStyle(color: Colors.red)),
          ],
        ],
      ),
    ),
    actions: [
      if (!widget.update.required && !downloading)
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Later'),
        ),
      FilledButton(
        onPressed: downloading ? null : _startOrContinue,
        child: Text(downloadedPath == null ? 'Update now' : 'Continue update'),
      ),
    ],
  );

  Future<void> _startOrContinue() async {
    if (downloadedPath != null) {
      await _launchInstaller();
      return;
    }
    setState(() {
      downloading = true;
      error = null;
      status = 'Downloading a verified update…';
    });
    try {
      final path = await widget.service.download(
        widget.update,
        onProgress: (value) {
          if (mounted) setState(() => progress = value);
        },
      );
      if (!mounted) return;
      setState(() {
        downloadedPath = path;
        downloading = false;
        status = 'Download verified. Android will ask before installation.';
      });
      await _launchInstaller();
    } catch (cause) {
      if (!mounted) return;
      setState(() {
        downloading = false;
        error = cause.toString();
        status = null;
      });
    }
  }

  Future<void> _continueAfterPermission() async {
    if (await widget.service.canInstall()) {
      await _launchInstaller();
    } else if (mounted) {
      setState(
        () => status = 'Allow installs from NEOT, then return to continue.',
      );
    }
  }

  Future<void> _launchInstaller() async {
    final path = downloadedPath;
    if (path == null) return;
    final result = await widget.service.install(path);
    if (!mounted) return;
    setState(() {
      status = result == 'permission_required'
          ? 'Allow installs from NEOT, then return to continue.'
          : 'Review and approve the Android installation.';
    });
  }
}
