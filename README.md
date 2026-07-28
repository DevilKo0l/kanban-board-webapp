# Kanban Board Webapp

Local Project Management MVP with a FastAPI backend, Next.js frontend, SQLite persistence, and OpenRouter-backed AI assistant.

## Current Status

Current scaffolding provides:

- FastAPI application under `apps/backend/api`.
- Next.js Kanban UI under `apps/frontend/web`.
- MVP sign-in using `user` and `password`.
- Backend-managed HttpOnly session cookie.
- `GET /` temporary static page in the current backend container until the frontend build is wired into FastAPI.
- `GET /api/health`.
- `GET /api/v1/status`.
- `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, and `POST /api/v1/auth/logout`.
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
