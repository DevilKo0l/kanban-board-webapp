from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, ConfigDict

from src.config.settings import Settings, get_settings


class HealthResponse(BaseModel):
    status: str
    app_env: str

    model_config = ConfigDict(populate_by_name=True, alias_generator=None)


class ApiStatusResponse(BaseModel):
    name: str
    version: str
    api_prefix: str


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()
    app = FastAPI(title="Kanban Board API", version="0.1.0")
    app.state.settings = resolved_settings

    @app.get("/", include_in_schema=False)
    def read_root() -> HTMLResponse:
        return HTMLResponse(
            """
            <!doctype html>
            <html lang="en">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Kanban Board MVP</title>
                <style>
                  body {
                    margin: 0;
                    min-height: 100vh;
                    display: grid;
                    place-items: center;
                    font-family: Arial, sans-serif;
                    color: #252525;
                    background: #ffffff;
                  }
                  main {
                    max-width: 42rem;
                    padding: 2rem;
                    border: 1px solid #e7e7eb;
                    border-radius: 8px;
                    box-shadow: 0 8px 24px rgba(32, 32, 32, 0.08);
                  }
                  h1 {
                    margin: 0 0 0.75rem;
                    font-size: 1.75rem;
                  }
                  p {
                    margin: 0;
                    color: #77777f;
                    line-height: 1.5;
                  }
                </style>
              </head>
              <body>
                <main>
                  <h1>Kanban Board MVP</h1>
                  <p>FastAPI is serving the temporary Phase 2 frontend placeholder.</p>
                </main>
              </body>
            </html>
            """.strip()
        )

    @app.get("/api/health", response_model=HealthResponse)
    def read_health() -> HealthResponse:
        return HealthResponse(status="ok", app_env=resolved_settings.app_env)

    @app.get("/api/v1/status", response_model=ApiStatusResponse)
    def read_api_status() -> ApiStatusResponse:
        return ApiStatusResponse(name="kanban-api", version="0.1.0", api_prefix="/api/v1")

    return app
