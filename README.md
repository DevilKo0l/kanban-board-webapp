# Kanban Board Webapp

Local Project Management MVP with a FastAPI backend, exported Next.js frontend, SQLite persistence, hardcoded MVP sign-in, and an OpenRouter-backed AI assistant.

## Run Locally

Create a root `.env` file from `.env.example` and set `OPENROUTER_API_KEY` before using AI chat.

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

Open `http://localhost:8000`. Sign in with username `user` and password `password`.

## Development

```bash
npm --workspace @kanban/types run check
npm --workspace @kanban/web run check
npm --workspace @kanban/web run lint
npm --workspace @kanban/web run test
npm --workspace @kanban/web run build
uv sync --project apps/backend/api
uv run --project apps/backend/api ruff check apps/backend/api/src apps/backend/api/tests
uv run --project apps/backend/api mypy apps/backend/api/src apps/backend/api/tests
uv run --project apps/backend/api pytest apps/backend/api/tests
docker build .
```

During frontend development, run the Next.js dev server from `apps/frontend/web` and open `http://localhost:3000`; browser API requests are sent to `http://localhost:8000`.

## Notes

- FastAPI serves the built Next.js static export at `/` in the Docker image.
- SQLite data persists under `data/` through Docker Compose.
- The committed `.env.example` must not contain real API keys.
