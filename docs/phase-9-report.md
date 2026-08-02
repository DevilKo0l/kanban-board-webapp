# Phase 9 Report

## Scope

Phase 9 added backend structured AI card actions. It does not connect the frontend AI drawer yet; that remains Phase 10.

## What Changed

- Added authenticated `POST /api/v1/ai/chat`.
- Sent the current canonical board JSON, user message, and the last relevant conversation messages to OpenRouter.
- Required the model to return structured JSON with `assistantMessage` and optional `actions`.
- Supported only `create_card`, `edit_card`, and `move_card`.
- Allowed edits only for title, description, and due date.
- Resolved columns by stable `columnStatusKey` or validated `columnId`.
- Rejected unsupported actions and unsupported fields.
- Applied all AI card actions in one SQLAlchemy transaction.
- Returned the assistant message, applied actions, and updated canonical board response.

## Key Decisions

- The backend treats model output as untrusted and validates every action before committing.
- Unsupported or ambiguous instructions should be represented by the model as a helpful assistant message with no actions.
- If the model still returns an unsupported action, the backend rejects it and leaves the board unchanged.
- Multi-action responses are all-or-nothing; a failure in any action rolls back earlier actions from that response.
- Column display names are intentionally not used as the only movement target because labels can be renamed.

## Validation

- `uv run pytest --basetemp .pytest-tmp` passed with 30 backend tests.
- `uv run ruff check .` passed.
- `uv run mypy src tests` passed.
- `docker compose up --build -d` passed and restarted the backend container.
- Live local smoke passed on `http://localhost:8000`: signed-out AI chat returned 401, login returned 200, and signed-in AI chat without a configured key returned 503 with a safe missing-key detail.
- After adding a local `OPENROUTER_API_KEY` to ignored `.env`, live AI chat returned a normal assistant message with zero actions and did not change the board card count.

## Notes

- Automated tests mock OpenRouter and do not require network access or provider credentials.
- Frontend AI drawer integration and live chat UX are intentionally left for Phase 10.
