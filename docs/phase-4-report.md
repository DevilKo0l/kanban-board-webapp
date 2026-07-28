# Phase 4 Report

## Scope

Phase 4 added MVP authentication. It gates the existing frontend board behind sign-in and adds backend-managed signed sessions using an HttpOnly cookie. It does not add registration, roles, production identity, database-backed users, or board persistence.

## What Changed

- Added backend auth routes under `/api/v1/auth`:
  - `POST /login`
  - `GET /me`
  - `POST /logout`
- Accepted only the MVP credentials `user` and `password`.
- Added signed session-token creation and validation using standard-library HMAC.
- Set the session in a `kanban_session` HttpOnly, SameSite=Lax cookie. The cookie is `secure` only when `APP_ENV=production` so local HTTP development works.
- Added local credentialed CORS support for the frontend dev server through `CORS_ORIGINS`.
- Added frontend auth API helpers, sign-in screen, auth gate, and header sign-out control.
- Added shared auth response types in `packages/types`.
- Updated README and `.env.example` with current auth endpoints and local auth configuration.

## Implementation Notes

- If `SESSION_SECRET` is blank, the backend generates an ephemeral process-local secret. This avoids hardcoding a secret and keeps local sessions invalid after restart.
- The frontend API client uses same-origin requests when served by FastAPI and `http://localhost:8000` when running under the Next dev server on port 3000.
- The sign-in screen uses the same dark header, border, text, and purple tokens as the board shell without rendering a preview board before authentication.

## Validation

- `uv run pytest` passed with 7 tests.
- `uv run ruff check .` passed.
- `uv run mypy src tests` passed.
- `docker run --rm -v "${PWD}:/workspace" -w /workspace node:22.14.0-bookworm npm --workspace=@kanban/types run check` passed.
- `docker run --rm -v "${PWD}:/workspace" -w /workspace node:22.14.0-bookworm npm --workspace=@kanban/types run build` passed.
- `docker run --rm -v "${PWD}:/workspace" -w /workspace node:22.14.0-bookworm npm --workspace=@kanban/web run check` passed.
- `docker run --rm -v "${PWD}:/workspace" -w /workspace node:22.14.0-bookworm npm --workspace=@kanban/web run lint` passed.
- `docker run --rm -v "${PWD}:/workspace" -w /workspace node:22.14.0-bookworm npm --workspace=@kanban/web run test` passed with 3 files and 15 tests.
- `docker run --rm -v "${PWD}:/workspace" -w /workspace node:22.14.0-bookworm npm --workspace=@kanban/web run build` passed.
- `docker compose up --build -d` passed and restarted the backend on port 8000.
- Live backend auth smoke passed: signed-out `/me` returned 401, bad login returned 401, correct login returned 200, `/me` returned the user, and logout returned 204.
- Browser auth smoke passed at `http://localhost:3000`: signed-out users saw sign-in, invalid credentials showed the error, valid credentials opened the board, logout returned to sign-in, and no console warnings or errors appeared.

## Remaining Risks

- The backend still serves the Phase 2 placeholder at `/`; wiring the built Next frontend into FastAPI remains a later phase.
- Users are still hardcoded and not database-backed; persistent user records belong with the database phases.
