import 'package:flutter/material.dart';

import 'api_client.dart';
import 'auth_screen.dart';
import 'home_screen.dart';
import 'learning_controller.dart';
import 'neot_logo.dart';
import 'update_service.dart';

class NeotApp extends StatefulWidget {
  const NeotApp({super.key});
  @override
  State<NeotApp> createState() => _NeotAppState();
}

class _NeotAppState extends State<NeotApp> {
  final navigatorKey = GlobalKey<NavigatorState>();
  final updateService = UpdateService();
  late final LearningController controller;
  late final Future<String> versionLabel;
  AppUpdate? availableUpdate;
  bool checkingForUpdate = false;
  bool hadSignedInSession = false;

  @override
  void initState() {
    super.initState();
    versionLabel = updateService.currentVersionLabel();
    controller = LearningController(ApiClient());
    controller.addListener(_handleSessionChange);
    controller.initialize();
  }

  @override
  void dispose() {
    controller.removeListener(_handleSessionChange);
    controller.dispose();
    updateService.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    navigatorKey: navigatorKey,
    title: 'NEOT',
    theme: ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: Colors.white,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xff365314),
        brightness: Brightness.light,
        surface: Colors.white,
      ),
      fontFamily: 'Roboto',
      cardTheme: const CardThemeData(
        elevation: 0,
        color: Colors.white,
        margin: EdgeInsets.symmetric(vertical: 5),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(14)),
          side: BorderSide(color: Color(0xffe2e6dc)),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: Color(0xff20251b),
        surfaceTintColor: Colors.transparent,
      ),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: Color(0xffe8efe0),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: const Color(0xff365314),
          foregroundColor: Colors.white,
          minimumSize: const Size(0, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    ),
    home: ListenableBuilder(
      listenable: controller,
      builder: (context, _) => AnimatedSwitcher(
        duration: const Duration(milliseconds: 220),
        child: _screenFor(controller),
      ),
    ),
  );

  void _handleSessionChange() {
    if (controller.signedIn && !hadSignedInSession) {
      hadSignedInSession = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _checkForUpdate());
      return;
    }
    if (!controller.signedIn && hadSignedInSession) {
      hadSignedInSession = false;
      if (mounted) setState(() => availableUpdate = null);
    }
  }

  Future<void> _checkForUpdate({bool announceResult = false}) async {
    if (!controller.signedIn || checkingForUpdate) return;
    setState(() => checkingForUpdate = true);
    try {
      final update = await updateService.check();
      if (!mounted || !controller.signedIn) return;
      setState(() => availableUpdate = update);
      if (announceResult && update == null) {
        _showMessage('NEOT is up to date.');
      }
    } catch (cause) {
      if (announceResult) {
        _showMessage('Could not check for updates. Try again later.');
      } else {
        debugPrint('NEOT update check skipped: $cause');
      }
    } finally {
      if (mounted) setState(() => checkingForUpdate = false);
    }
  }

  void _showMessage(String message) {
    final context = navigatorKey.currentContext;
    if (context == null || !context.mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  Widget _screenFor(LearningController controller) {
    if (controller.loading && controller.snapshot == null) {
      return _Loader(key: const ValueKey('loader'), versionLabel: versionLabel);
    }
    if (!controller.signedIn || controller.snapshot == null) {
      return AuthScreen(key: const ValueKey('welcome'), controller: controller);
    }
    return HomeScreen(
      key: const ValueKey('home'),
      controller: controller,
      update: availableUpdate,
      updateService: updateService,
      versionLabel: versionLabel,
      checkingForUpdate: checkingForUpdate,
      onCheckForUpdate: () => _checkForUpdate(announceResult: true),
    );
  }
}

class _Loader extends StatelessWidget {
  const _Loader({super.key, required this.versionLabel});

  final Future<String> versionLabel;

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.white,
    body: SafeArea(
      child: Column(
        children: [
          const Expanded(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  NeotLogo(size: 82),
                  SizedBox(height: 22),
                  Text(
                    'NEOT',
                    style: TextStyle(
                      color: Color(0xff365314),
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2.2,
                    ),
                  ),
                  SizedBox(height: 7),
                  Text(
                    'Learn today. Own tomorrow.',
                    style: TextStyle(color: Color(0xff66705d), fontSize: 14),
                  ),
                  SizedBox(height: 28),
                  SizedBox(
                    width: 96,
                    child: LinearProgressIndicator(
                      minHeight: 3,
                      borderRadius: BorderRadius.all(Radius.circular(20)),
                    ),
                  ),
                ],
              ),
            ),
          ),
          FutureBuilder<String>(
            future: versionLabel,
            builder: (context, snapshot) => Text(
              snapshot.data ?? '',
              style: const TextStyle(color: Color(0xff7b8374), fontSize: 12),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    ),
  );
}
