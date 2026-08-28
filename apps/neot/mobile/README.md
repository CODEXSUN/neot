# NEOT Mobile

NEOT Mobile is the native Flutter client for students. It connects to the NEOT Node API.

## Features

- Local development login and session storage.
- Course and lesson navigation.
- Lesson progress and continue-learning flows.
- Quizzes, scores, and performance summaries.

## Local development

The Android emulator connects to the local API at `http://10.0.2.2:9250`.

```powershell
flutter pub get
flutter test
flutter run
```

The Android package ID is `in.neot.mobile`.

React belongs to the web application. Flutter owns the mobile user interface and Android project.
