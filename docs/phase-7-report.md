# Phase 7 Report

## Scope

Phase 7 connected the approved frontend Kanban experience to the persistent FastAPI and SQLite board API from Phase 6.

## What Changed

- Replaced frontend demo board state with `GET /api/v1/board`.
- Added a typed board API client under the frontend board feature.
- Added API-backed column renaming.
- Connected card creation and editing to backend create/update endpoints.
- Connected keyboard and drag move calculations to the backend move endpoint.
- Kept search and column collapse as local presentation behavior.
- Removed obsolete frontend seed data while keeping backend database initialization as the source of demo cards.
- Added loading, retry, refresh, and mutation error states that preserve the board shell.
- Aligned shared TypeScript contracts with backend response and request shapes.
- Added frontend contract and board experience tests using backend-shaped board responses.
- Added backend tests for board response contract shape and `PATCH` CORS preflight support.

## Key Decisions

- Mutations refresh or receive canonical backend board state instead of using optimistic local writes.
- Failed mutations keep the existing UI state and show an error notice or dialog message.
- Drag-and-drop still uses `dnd-kit`; the frontend now calculates a backend move payload instead of reordering local state.
- Column collapse remains local UI state and is not persisted to the database.
- Board search remains client-side because the MVP board size does not justify server search.

## Validation

- Direct TypeScript check passed for the frontend with `node node_modules\\typescript\\bin\\tsc -p apps/frontend/web/tsconfig.check.json --noEmit`.
- Direct TypeScript check passed for shared types with `node node_modules\\typescript\\bin\\tsc -p packages/types/tsconfig.json --noEmit`.
- `uv run pytest --basetemp .pytest-tmp` passed with 15 backend tests.
- `uv run ruff check .` passed.
- `uv run mypy src tests` passed.
- `docker compose up --build -d` passed and restarted the backend container.
- Live API smoke passed on `http://localhost:8000` for health, auth, board load, column rename, card create/edit/move, and `PATCH` CORS preflight.
- Restarted the existing `kanban-frontend-preview` Node 22 container and verified `http://localhost:3000` in the in-app browser.
- Browser validation passed for sign-in, backend-loaded board display, Phase 7 rename control presence, reversible column rename through the UI, and no console errors.

## Blocked Validation

- `npm --workspace @kanban/web run check` and `npm --workspace @kanban/types run check` could not resolve the local `tsc` shim in the current npm workspace setup.
- `npm install` failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` while downloading from the npm registry.
- Frontend Vitest, ESLint, and Next build are blocked by the active system Node runtime, `v16.13.1`. The installed frontend toolchain requires Node 20+.
- The existing Dockerized frontend preview uses Node 22 and was usable for browser validation, but the host npm/Node runtime still prevents running the standard frontend scripts directly from PowerShell.

## Notes

- Backend CORS now allows `PATCH` so the frontend can rename columns and edit cards from `http://localhost:3000`.
- The connected frontend still runs through the Next.js dev server during Phase 7. Serving the built Next.js frontend from FastAPI remains part of the later final integration work.
