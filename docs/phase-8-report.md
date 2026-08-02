# Phase 8 Report

## Scope

Phase 8 added backend-only OpenRouter connectivity for a minimal AI verification request. It does not implement board-changing AI actions; those remain Phase 9.

## What Changed

- Added an OpenRouter REST client under `src/modules/ai.py`.
- Added authenticated `POST /api/v1/ai/verify`.
- Read `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL`, timeout, and retry settings from backend settings.
- Used the configured model default `openai/gpt-oss-120b`.
- Added safe handling for missing configuration, provider authentication/rate-limit/server errors, timeouts, malformed JSON, and invalid response shapes.
- Added retry behavior for temporary provider failures.
- Added mocked backend tests so automated validation does not call OpenRouter.
- Kept the OpenRouter API key backend-only and excluded it from frontend contracts and responses.

## Key Decisions

- Used the direct OpenRouter Chat Completions REST endpoint to avoid adding a runtime SDK dependency.
- Kept the verification route authenticated because it can spend provider credits.
- Returned only a safe model name and assistant message from verification; no API key, request headers, raw provider payload, or debug data is returned.
- Live provider verification is optional and only meaningful when a valid `OPENROUTER_API_KEY` exists in the root `.env`.

## OpenRouter References

- OpenRouter Quickstart documents the `POST /api/v1/chat/completions` endpoint and Bearer-token request pattern.
- OpenRouter Authentication documents API-key use through the `Authorization: Bearer` header.
- OpenRouter Chat Completion reference documents the request fields and response shape.
- OpenRouter Errors and Debugging documents provider error envelopes with `error.error_type`.

## Validation

- `uv run pytest --basetemp .pytest-tmp` passed with 22 backend tests.
- `uv run ruff check .` passed.
- `uv run mypy src tests` passed.
- `docker compose up --build -d` passed and restarted the backend container.
- Live local smoke passed on `http://localhost:8000`: health returned ok, signed-out AI verification returned 401, login returned 200, and signed-in AI verification without a configured key returned 503 with a safe missing-key detail.

## Notes

- Live OpenRouter provider verification was not run because no local `OPENROUTER_API_KEY` is configured.
- `POST /api/v1/ai/verify` returns `503` with `OpenRouter API key is not configured.` when no key is available.
