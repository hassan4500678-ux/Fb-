# Employee Attendance Tracker

A dependency-free browser app for tracking employee attendance. It stores data
locally in the browser, so it can be run as a static site with no backend setup.

## Features

- Add employees with name, department, and role.
- Select an attendance date.
- Clock employees in and out.
- Mark employees absent or reset a daily record.
- View daily totals for employees, active attendance, absences, and hours.
- Search the employee roster.
- Export the selected day's attendance log as a CSV file.

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static file
server, for example:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Build Android APK

Install the npm dependencies and make sure `ANDROID_HOME` points to an Android
SDK that includes platform 36 and Android build tools:

```bash
npm install
npm run build:apk
```

The debug APK is generated at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```
