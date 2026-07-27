#!/usr/bin/env sh
set -eu

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but was not found on PATH." >&2
  exit 1
fi

docker compose version >/dev/null
docker compose up --build -d

if ! docker compose ps --status running --services | grep -qx "app"; then
  docker compose ps
  docker compose down
  echo "Application container is not running." >&2
  exit 1
fi

port="${APP_PORT:-8000}"
echo "Application URL: http://localhost:${port}"
