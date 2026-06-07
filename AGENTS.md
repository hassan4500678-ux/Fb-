# AGENTS.md

## Project overview

**Employee Attendance Tracker** — a dependency-free static web app (`index.html`, `app.js`, `styles.css`) for tracking employee clock-in/out, absences, and daily attendance logs. Data is stored in the browser via `localStorage`.

> **Note:** `main` currently contains only a placeholder README. The runnable application lives on `cursor/employee-attendance-tracker-8f9b` (and branches derived from it).

## Cursor Cloud specific instructions

### Services

| Service | Required | Port | Start command |
|---------|----------|------|---------------|
| Static file server | Yes | 8000 | `python3 -m http.server 8000` |

No database, backend, or package install is required.

### Development workflow

1. Ensure you are on a branch that includes the app files (`index.html`, `app.js`, `styles.css`).
2. From the repo root, start the static server (see README).
3. Open `http://localhost:8000` in a browser.

### Lint / test / build

There is no configured linter, test runner, or build step. Optional sanity checks:

- `node --check app.js` — verify JavaScript syntax
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/` — confirm the server is serving `index.html`

### Secrets and environment variables

None required.

### Gotchas

- Opening `index.html` via `file://` may work, but serving over HTTP (as in the README) is the recommended local workflow.
- Attendance state persists in browser `localStorage` under the key `employee-attendance-tracker-state`.
