# Faizan & Brothers EMS Flutter Frontend

This folder contains the real Flutter Android frontend for Faizan & Brothers EMS.

It is not a WebView, PWA, Expo app, or localhost app.

## Structure

```text
lib/
  app.dart
  main.dart
  core/
    config/api_config.dart
    network/api_client.dart
    storage/token_store.dart
    theme/app_theme.dart
  features/
    auth/
      data/auth_repository.dart
      models/auth_user.dart
      presentation/login_screen.dart
    dashboard/
      presentation/dashboard_screen.dart
  shared/widgets/neon_card.dart
android/
  app/src/main/AndroidManifest.xml
  app/src/main/res/xml/network_security_config.xml
```

## API URL

Production devices must use a deployed backend URL.

Do not use:

- `localhost`
- `127.0.0.1`

Use either:

1. Build-time configuration:

```bash
flutter build apk --release --dart-define=EMS_API_BASE_URL=https://api.your-domain.com
flutter build appbundle --release --dart-define=EMS_API_BASE_URL=https://api.your-domain.com
```

2. Runtime configuration:

Enter the deployed API URL in the login screen's **API Base URL** field.

The app checks:

- `GET /health`
- `POST /api/auth/login`
- `GET /api/me`

## Backend

Use the separate `../backend` Node.js + Express API with PostgreSQL:

```bash
cd ../backend
cp .env.example .env
npm install
npm run migrate
npm run seed
npm start
```

Admin login after seeding:

- Email: `hassanullahkhan989@gmail.com`
- Password: `Hassan`

## Android release

With Flutter installed:

```bash
cd flutter_frontend
flutter pub get
flutter analyze
flutter test
flutter build apk --release --dart-define=EMS_API_BASE_URL=https://api.your-domain.com
flutter build appbundle --release --dart-define=EMS_API_BASE_URL=https://api.your-domain.com
```

Output:

- `build/app/outputs/flutter-apk/app-release.apk`
- `build/app/outputs/bundle/release/app-release.aab`

## Notes

- `INTERNET` and `ACCESS_NETWORK_STATE` permissions are declared.
- `windowSoftInputMode="adjustResize"` is configured for keyboard-safe login.
- HTTP cleartext is enabled for staging/LAN testing; HTTPS is recommended for production.
- JWT token and API URL are stored in Android private app storage through a MethodChannel.
