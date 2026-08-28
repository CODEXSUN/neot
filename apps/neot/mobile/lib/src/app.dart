import 'package:flutter/material.dart';

import 'api_client.dart';
import 'auth_screen.dart';
import 'home_screen.dart';
import 'learning_controller.dart';
import 'neot_logo.dart';
import 'update_prompt.dart';
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
  @override
  void initState() {
    super.initState();
    controller = LearningController(ApiClient())..initialize();
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkForUpdate());
  }

  @override
  void dispose() {
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

  Future<void> _checkForUpdate() async {
    try {
      final update = await updateService.check();
      if (!mounted || update == null) return;
      final context = navigatorKey.currentContext;
      if (context == null || !context.mounted) return;
      await showUpdatePrompt(context, update, updateService);
    } catch (cause) {
      // An unavailable update channel must never block learning.
      debugPrint('NEOT update check skipped: $cause');
    }
  }

  Widget _screenFor(LearningController controller) {
    if (controller.loading && controller.snapshot == null) {
      return const _Loader(key: ValueKey('loader'));
    }
    if (!controller.signedIn || controller.snapshot == null) {
      return AuthScreen(key: const ValueKey('welcome'), controller: controller);
    }
    return HomeScreen(key: const ValueKey('home'), controller: controller);
  }
}

class _Loader extends StatelessWidget {
  const _Loader({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.white,
    body: const Center(
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
  );
}
