#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

docker compose up -d postgres
cd backend
cp -n .env.example .env >/dev/null 2>&1 || true
npm run migrate
npm run seed
npm start
