FROM node:22-bookworm-slim AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/frontend/web/package.json ./apps/frontend/web/
RUN npm ci

COPY packages/types ./packages/types
COPY apps/frontend/web ./apps/frontend/web
RUN npm --workspace @kanban/types run build
RUN npm --workspace @kanban/web run build

FROM python:3.14-slim AS runtime

COPY --from=ghcr.io/astral-sh/uv:0.11.29 /uv /usr/local/bin/uv

ENV APP_HOST=0.0.0.0 \
    APP_PORT=8000 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

COPY apps/backend/api/pyproject.toml apps/backend/api/uv.lock ./apps/backend/api/
RUN uv sync --project apps/backend/api --locked --no-dev

COPY apps/backend/api ./apps/backend/api
COPY --from=frontend /app/apps/frontend/web/out ./apps/frontend/web/out

RUN mkdir -p /app/data

WORKDIR /app/apps/backend/api

EXPOSE 8000

CMD ["uv", "run", "--locked", "--no-dev", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
