#!/usr/bin/env bash
# ============================================================
# Cash Pro v2 — one-command local dev bootstrap.
#
#   ./scripts/dev-up.sh           (or: pnpm dev:up)
#
# Does everything needed to "see it running":
#   1. Loads .env (creates it from .env.example on first run).
#   2. Ensures a PostgreSQL is reachable (reuses one if up; else starts a
#      Docker container; else points you at docker compose).
#   3. Applies Drizzle migrations.
#   4. Launches API + Web together (turbo dev).
#
# Open http://localhost:3000 — in dev mode (no Clerk keys) the web auto-creates
# a demo company with sample data. No accounts required.
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { printf '\033[1;36m▶ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }

# --- 1. Environment -----------------------------------------------------------
if [[ ! -f .env ]]; then
  log "Creating .env from .env.example"
  cp .env.example .env
fi
set -a
# shellcheck disable=SC1091
source .env
set +a
: "${DATABASE_URL:?DATABASE_URL must be set in .env}"

# --- 2. Dependencies ----------------------------------------------------------
if [[ ! -d node_modules ]]; then
  log "Installing dependencies (pnpm install)"
  pnpm install
fi

# --- 3. PostgreSQL ------------------------------------------------------------
pg_reachable() {
  # Parse host:port from DATABASE_URL (defaults localhost:5432).
  local hostport host port
  hostport="$(printf '%s' "$DATABASE_URL" | sed -E 's#.*@([^/?]+).*#\1#')"
  host="${hostport%%:*}"; port="${hostport##*:}"
  [[ "$port" == "$host" ]] && port=5432
  (exec 3<>"/dev/tcp/${host}/${port}") 2>/dev/null && { exec 3>&-; return 0; } || return 1
}

if pg_reachable; then
  log "PostgreSQL already reachable — reusing it"
elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if [[ -z "$(docker ps -aq -f name=^cashpro-pg$)" ]]; then
    log "Starting PostgreSQL 16 (docker container 'cashpro-pg')"
    docker run -d --name cashpro-pg \
      -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cashpro \
      -p 5432:5432 postgres:16 >/dev/null
  else
    log "Starting existing 'cashpro-pg' container"
    docker start cashpro-pg >/dev/null
  fi
  log "Waiting for PostgreSQL to accept connections…"
  for _ in $(seq 1 30); do pg_reachable && break; sleep 1; done
  pg_reachable || { warn "PostgreSQL did not come up in time"; exit 1; }
else
  warn "No reachable PostgreSQL and Docker is unavailable."
  warn "Start one and re-run, e.g.:"
  warn "  docker compose -f docker/docker-compose.yml up -d postgres"
  exit 1
fi

# --- 4. Migrate ---------------------------------------------------------------
log "Applying migrations"
pnpm --filter @cash-pro/db migrate

# --- 5. Run -------------------------------------------------------------------
log "Starting API (:${PORT:-8080}) + Web (:3000) — open http://localhost:3000"
exec pnpm turbo run dev
