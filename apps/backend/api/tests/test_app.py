from fastapi.testclient import TestClient

from src.app import create_app


def test_root_serves_temporary_page() -> None:
    client = TestClient(create_app())

    response = client.get("/")

    assert response.status_code == 200
    assert "Kanban Board MVP" in response.text


def test_health_endpoint() -> None:
    client = TestClient(create_app())

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "app_env": "development"}


def test_versioned_status_endpoint() -> None:
    client = TestClient(create_app())

    response = client.get("/api/v1/status")

    assert response.status_code == 200
    assert response.json() == {
        "name": "kanban-api",
        "version": "0.1.0",
        "api_prefix": "/api/v1",
    }
