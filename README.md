# Kanban Board Webapp

Local Project Management MVP with a FastAPI backend, Next.js frontend, SQLite persistence, and OpenRouter-backed AI assistant.

## Current Status

Current scaffolding provides:

- FastAPI application under `apps/backend/api`.
- Next.js Kanban UI under `apps/frontend/web`.
- MVP sign-in using `user` and `password`.
- Backend-managed HttpOnly session cookie.
- Frontend board loading from the persistent backend API.
- API-backed column rename, card create/edit, and card move/reorder behavior.
- `GET /` temporary static page in the current backend container until the frontend build is wired into FastAPI.
- `GET /api/health`.
- `GET /api/v1/status`.
- `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, and `POST /api/v1/auth/logout`.
- Persistent board API endpoints under `/api/v1/board`, `/api/v1/columns`, and `/api/v1/cards`.
- Backend-only OpenRouter verification at `POST /api/v1/ai/verify`.
- Structured AI card action endpoint at `POST /api/v1/ai/chat`.
- SQLite initialization for the MVP user, board, fixed columns, and demo cards.
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

The backend API URL is `http://localhost:8000`.

During frontend development, run the Next.js app from `apps/frontend/web` and open `http://localhost:3000`; browser API requests are sent to `http://localhost:8000`.

Set `OPENROUTER_API_KEY` in the root `.env` file before using the AI verification endpoint or later AI phases.
