# Phase 6 Report

## Scope

Phase 6 implemented the persistent backend API for the Kanban board. The frontend still uses local demo state until Phase 7 connects it to these endpoints.

## What Changed

- Added SQLAlchemy 2.x to the backend dependencies.
- Added database engine/session creation under `src/database/session.py`.
- Added SQLAlchemy models under `src/database/models.py` for `users`, `boards`, `board_columns`, and `cards`.
- Added idempotent database initialization under `src/database/init.py`.
- Seeded the MVP user, one board, four fixed status columns, and reference-inspired demo cards when a board has no cards.
- Added authenticated board APIs under `/api/v1`:
  - `GET /board`
  - `PATCH /columns/{column_id}`
  - `POST /cards`
  - `GET /cards/{card_id}`
  - `PATCH /cards/{card_id}`
  - `POST /cards/{card_id}/move`
- Reused the Phase 4 signed session cookie for authorization.
- Added backend tests for unauthorized access, initialization, rename persistence, create/read/edit card, move/reorder behavior, and invalid-move rollback.

## Key Decisions

- Card and column positions use deterministic integer spacing with a 1000 gap.
- Card moves renormalize affected source and target columns in one transaction.
- Column APIs expose rename only. There are no endpoints for column creation, deletion, or reordering.
- Lightweight card metadata remains scalar fields on `cards`. There are no subtask, attachment, upload, notification, team, or spaces tables.
- The backend returns board response fields in frontend-friendly camelCase while keeping database fields snake_case.

## Validation

- `uv --system-certs add sqlalchemy` completed and updated `pyproject.toml` and `uv.lock`.
- `uv run pytest --basetemp .pytest-tmp` passed with 13 tests.
- `uv run ruff check .` passed.
- `uv run mypy src tests` passed.
- `docker compose up --build -d` passed and restarted the backend container.
- Live API smoke passed on `http://localhost:8000`: health returned ok, signed-out board access returned 401, login returned 200, and `GET /api/v1/board` returned `Launch Plan` with 4 columns and 12 cards.

## Notes

- `uv add sqlalchemy` without `--system-certs` failed due the local TLS certificate chain. The successful command used system certificates.
- The frontend remains intentionally unconnected to these board endpoints until Phase 7.
- Live initialization created `data/kanban.db`; this local database file is ignored by git and excluded from the Docker build context.
