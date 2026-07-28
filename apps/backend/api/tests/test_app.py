from fastapi.testclient import TestClient

from src.app import create_app
from src.config.settings import Settings


def create_test_client() -> TestClient:
    return TestClient(
        create_app(
            Settings(
                app_env="development",
                session_secret="test-session-secret",
                cors_origins="http://localhost:3000",
            )
        )
    )


def test_root_serves_temporary_page() -> None:
    client = create_test_client()

    response = client.get("/")

    assert response.status_code == 200
    assert "Kanban Board MVP" in response.text


def test_health_endpoint() -> None:
    client = create_test_client()

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "app_env": "development"}


def test_versioned_status_endpoint() -> None:
    client = create_test_client()

    response = client.get("/api/v1/status")

    assert response.status_code == 200
    assert response.json() == {
        "name": "kanban-api",
        "version": "0.1.0",
        "api_prefix": "/api/v1",
    }


def test_current_user_requires_session() -> None:
    client = create_test_client()

    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required."}


def test_login_rejects_invalid_credentials() -> None:
    client = create_test_client()

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "user", "password": "wrong"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid username or password."}


def test_login_sets_http_only_session_cookie_and_allows_current_user() -> None:
    client = create_test_client()

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "user", "password": "password"},
    )

    assert response.status_code == 200
    assert response.json() == {"user": {"username": "user"}}
    cookie_header = response.headers["set-cookie"]
    assert "kanban_session=" in cookie_header
    assert "HttpOnly" in cookie_header
    assert "SameSite=lax" in cookie_header

    me_response = client.get("/api/v1/auth/me")

    assert me_response.status_code == 200
    assert me_response.json() == {"user": {"username": "user"}}


def test_logout_clears_session_cookie() -> None:
    client = create_test_client()
    client.post("/api/v1/auth/login", json={"username": "user", "password": "password"})

    response = client.post("/api/v1/auth/logout")

    assert response.status_code == 204
    assert "kanban_session=" in response.headers["set-cookie"]
    assert "Max-Age=0" in response.headers["set-cookie"]
