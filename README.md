# Kanban Board Webapp

Local Project Management MVP with a FastAPI backend, future Next.js frontend, SQLite persistence, and OpenRouter-backed AI assistant.

## Current Status

Phase 2 scaffolding provides:

- FastAPI application under `apps/backend/api`.
- `GET /` temporary static page.
- `GET /api/health`.
- `GET /api/v1/status`.
- Docker and platform start/stop scripts.

## Local Commands

Windows PowerShell:

```powershell
./scripts/start.ps1
./scripts/stop.ps1
```

macOS and Linux:

```bash
./scripts/start.sh
./scripts/stop.sh
```

The local application URL is `http://localhost:8000`.
