# Phase 2 Report

## Scope

Phase 2 created the backend and Docker scaffolding for the greenfield Kanban Board MVP. No board, authentication, database schema, frontend UI, or AI behavior was implemented in this phase.

## Files and Structure

Created:

- Root npm workspace: `package.json`, `package-lock.json`.
- Shared TypeScript contract package: `packages/types/package.json`, `packages/types/src/index.ts`, `packages/types/tsconfig.json`.
- FastAPI backend: `apps/backend/api/pyproject.toml`, `apps/backend/api/uv.lock`, `apps/backend/api/src`, `apps/backend/api/tests`.
- Docker and Compose: `Dockerfile`, `docker-compose.yml`, `.dockerignore`.
- Environment and ignore files: `.env.example`, `.gitignore`.
- Platform scripts: `scripts/start.ps1`, `scripts/stop.ps1`, `scripts/start.sh`, `scripts/stop.sh`.
- Minimal project README: `README.md`.

No duplicate root-level `frontend/` or `backend/` application directories were created.

## API Foundation

The FastAPI app currently provides:

- `GET /`: temporary static HTML placeholder served by FastAPI.
- `GET /api/health`: health response.
- `GET /api/v1/status`: simple versioned API response.

Runtime settings are loaded from environment variables with root `.env` support. `.env` is ignored and `.env.example` contains only safe placeholder values.

## Exact Commands Established

Root JavaScript workspace:

```bash
npm install --package-lock-only --ignore-scripts
npm --workspace @kanban/types run check
```

Backend:

```bash
uv sync
uv run ruff check .
uv run mypy src tests
uv run pytest
```

Docker:

```bash
docker build .
./scripts/start.ps1
./scripts/stop.ps1
./scripts/start.sh
./scripts/stop.sh
```

## Validation Performed

Passed:

- `npm install --package-lock-only --ignore-scripts`
- `uv --system-certs add fastapi "uvicorn[standard]" pydantic-settings python-dotenv`
- `uv --system-certs add --dev pytest httpx ruff mypy`
- `uv sync`
- `uv run ruff check .`
- `uv run mypy src tests`
- `uv run pytest`
- `docker build .`
- `./scripts/start.ps1`
- `Invoke-WebRequest http://localhost:8000/`
- `Invoke-RestMethod http://localhost:8000/api/health`
- `Invoke-RestMethod http://localhost:8000/api/v1/status`
- `./scripts/stop.ps1`

Observed endpoint responses:

```json
{"status":"ok","app_env":"development"}
```

```json
{"name":"kanban-api","version":"0.1.0","api_prefix":"/api/v1"}
```

## Issues and Limitations

- `npm view typescript version` and `npm view @types/node version` failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.
- `uv add` initially failed with `invalid peer certificate: UnknownIssuer`; rerunning with `--system-certs` succeeded without disabling TLS verification.
- `npm --workspace @kanban/types run check` failed because `tsc` is not installed yet. TypeScript compiler dependencies are deferred to the frontend/tooling phase unless npm registry certificate trust is fixed earlier.
- `./scripts/start.ps1` with the default `APP_PORT=8000` initially could not start because host port `8000` was already allocated on this machine. After the port was released, validation succeeded on `http://localhost:8000`.
- `uv run pytest` passed with one upstream `StarletteDeprecationWarning` about FastAPI's current test client path.

## Compatibility Impact

- Introduces Python 3.12 through 3.14 compatibility for the backend project.
- Docker uses pinned, non-floating image tags: `python:3.14-slim`, `ghcr.io/astral-sh/uv:0.11.29`, and local Compose image `kanban-board-webapp-app:0.1.0`.
- No database schema or persistent application data behavior was introduced yet.
- No frontend production build exists yet; `/` is a temporary FastAPI-served placeholder.
