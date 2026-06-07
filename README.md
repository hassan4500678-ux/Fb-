# Faizan & Brothers EMS

Production-oriented Android Employee Management System for Faizan & Brothers field employees and admins.

## What is included

- Real Android application project that builds signed release APK and AAB artifacts.
- Node.js + Express API.
- PostgreSQL-only persistent storage with migrations and seed data.
- No Firebase, Supabase, maps, routing, GPS tracking, background tracking, or demo local storage for business data.
- Dark neon blue enterprise UI with cached-first dashboard rendering and silent API refresh.

## Admin login

- Email: `hassanullahkhan989@gmail.com`
- Password: `Hassan`

## Core modules

- Admin and employee login with JWT sessions.
- Employee registry with add, edit, suspend, restore, and soft delete.
- Profile image URL/update fields and upload endpoints.
- Attendance with Asia/Karachi 9:15 AM half-day rule.
- Friday/holiday storage that prevents attendance display and salary deduction.
- Monthly target assignment with permanent history.
- KPI summaries, working day calculation, incentive tiers, and leaderboard.
- Virtual wallet, points, coins, monthly/yearly/lifetime totals, and transaction history.
- Salary generation with fixed allowances, deductions, KPI incentive, PC incentive, and badge bonus.
- PDF and Excel report endpoints.
- Certificate records with Faizan & Brothers LTD branch header and Hassan Khan approval footer.

## Local backend

```bash
cd /workspace
docker compose up -d postgres
cd backend
cp .env.example .env
npm install
npm run migrate
npm run seed
npm start
```

The API starts on port `8080` by default.

## Android release build

Set the production API URL before building:

```bash
export EMS_API_BASE_URL="https://api.your-domain.com"
./scripts/build_android_release.sh
```

The script installs a local Android SDK and Gradle distribution if missing, generates a local release keystore when no signing environment variables are provided, and produces:

- `artifacts/android/faizan-brothers-ems-release.apk`
- `artifacts/android/faizan-brothers-ems-release.aab`

The login screen also includes an API URL field. Use the public deployed backend URL there if the app was built without `EMS_API_BASE_URL`.

Important physical-device networking notes:

- `localhost` and `127.0.0.1` point to the phone itself, not your server.
- Use a public HTTPS backend URL for production.
- HTTP staging/LAN URLs are allowed by Android network security config for testing, but HTTPS is recommended for release distribution.
- The app checks `/health` before login and then posts to `/api/auth/login`.

For real Play Store distribution, provide a secure upload key instead of the generated fallback:

```bash
export EMS_RELEASE_STORE_FILE=/secure/path/upload-key.jks
export EMS_RELEASE_STORE_PASSWORD=...
export EMS_RELEASE_KEY_ALIAS=...
export EMS_RELEASE_KEY_PASSWORD=...
```

## Database

Run `npm run migrate` from `backend/` to apply `backend/db/schema.sql`.

Important tables:

- `employees`
- `attendance`
- `employee_monthly_targets`
- `holidays`
- `kpi_entries`
- `employee_wallets`
- `wallet_transactions`
- `salary_runs`
- `badges`
- `reports`
- `certificates`
- `submitted_sheets`
- `notifications`

## Android performance behavior

- Immediate shell render after launch.
- Cached dashboard data is shown instantly when present.
- API refresh runs silently with short timeouts and bounded retries.
- Invalid tokens clear the secure session and return to login.
- No skeleton loading is required beyond initial empty-cache state.
- Lightweight custom chart rendering avoids heavy chart dependencies.
