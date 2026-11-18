# Babar Azam Stats Book

Android app version of the Babar Azam Stats Book: team-wise, ground-wise and home/away records in ODI, T20I and Test, vs A-teams, vs bowlers, centuries and a shareable stats card.

**Download:** open the [release page](../../releases/tag/babar-stats-app-latest) on your phone and install `BabarAzamStatsBook.apk`.

- Everything you edit and save stays on your phone and works without internet.
- Tap **Update** (bottom right) to pull the newest design and stats from this repository. You can choose to keep the numbers you edited on the phone.

How it is built: `www/` holds the page, its data and the offline runtime (`app-shim.js`); `android/` is a small WebView app that shows it; GitHub Actions builds the APK on every push to the `babar-stats-app` branch.
