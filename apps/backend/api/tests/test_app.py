from pathlib import Path

from fastapi.testclient import TestClient

from src.app import create_app
from src.config.settings import Settings


def create_test_client(database_url: str = "sqlite:///:memory:") -> TestClient:
    return TestClient(
        create_app(
            Settings(
                app_env="development",
                database_url=database_url,
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


def test_board_requires_session() -> None:
    client = create_test_client()

    response = client.get("/api/v1/board")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required."}


def test_database_initializes_reference_board_for_signed_in_user() -> None:
    client = create_test_client()
    sign_in(client)

    response = client.get("/api/v1/board")

    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "Launch Plan"
    assert [column["statusKey"] for column in payload["columns"]] == [
        "todo",
        "in_progress",
        "in_review",
        "closed",
    ]
    assert [column["position"] for column in payload["columns"]] == [1000, 2000, 3000, 4000]
    assert len(payload["cards"]) == 12
    assert payload["cards"][0]["title"] == "Finalize campaign brief"
    assert payload["cards"][0]["assigneeInitials"] == ["ML", "JR"]


def test_board_response_contract_uses_frontend_camel_case_keys() -> None:
    client = create_test_client()
    sign_in(client)

    response = client.get("/api/v1/board")

    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == {"id", "name", "columns", "cards"}
    assert set(payload["columns"][0]) == {"id", "statusKey", "name", "position"}
    assert {
        "id",
        "columnId",
        "title",
        "description",
        "dueDate",
        "position",
        "assigneeInitials",
        "subtaskCount",
        "attachmentCount",
        "flagged",
        "coverVariant",
        "createdAt",
        "updatedAt",
    } == set(payload["cards"][0])


def test_cors_allows_frontend_patch_requests() -> None:
    client = create_test_client()

    response = client.options(
        "/api/v1/cards/card-brief",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "PATCH",
        },
    )

    assert response.status_code == 200
    assert "PATCH" in response.headers["access-control-allow-methods"]


def test_column_rename_persists_after_app_restart(tmp_path: Path) -> None:
    database_url = sqlite_url(tmp_path / "kanban.db")
    client = create_test_client(database_url)
    sign_in(client)

    response = client.patch("/api/v1/columns/col-todo", json={"name": "Backlog"})

    assert response.status_code == 200
    assert response.json()["name"] == "Backlog"

    restarted_client = create_test_client(database_url)
    sign_in(restarted_client)
    board_response = restarted_client.get("/api/v1/board")

    assert board_response.status_code == 200
    columns = board_response.json()["columns"]
    assert columns[0]["statusKey"] == "todo"
    assert columns[0]["name"] == "Backlog"


def test_create_read_and_edit_card() -> None:
    client = create_test_client()
    sign_in(client)

    create_response = client.post(
        "/api/v1/cards",
        json={
            "columnId": "col-todo",
            "title": "Prepare launch recap",
            "description": "Draft the recap notes.",
            "dueDate": "2026-09-02",
            "assigneeInitials": ["ab"],
            "subtaskCount": 2,
            "attachmentCount": 1,
            "flagged": True,
            "coverVariant": "waves",
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()
    assert created["title"] == "Prepare launch recap"
    assert created["assigneeInitials"] == ["AB"]
    assert created["position"] == 4000

    card_response = client.get(f"/api/v1/cards/{created['id']}")
    assert card_response.status_code == 200
    assert card_response.json()["description"] == "Draft the recap notes."

    update_response = client.patch(
        f"/api/v1/cards/{created['id']}",
        json={"title": "Prepare launch recap draft", "description": None, "flagged": False},
    )

    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["title"] == "Prepare launch recap draft"
    assert updated["description"] is None
    assert updated["flagged"] is False


def test_move_card_reorders_within_and_across_columns() -> None:
    client = create_test_client()
    sign_in(client)

    response = client.post(
        "/api/v1/cards/card-budget/move",
        json={"columnId": "col-progress", "position": 1},
    )

    assert response.status_code == 200
    board = response.json()
    progress_cards = [
        card for card in board["cards"] if card["columnId"] == "col-progress"
    ]
    todo_cards = [card for card in board["cards"] if card["columnId"] == "col-todo"]
    assert [card["id"] for card in progress_cards] == [
        "card-copy",
        "card-budget",
        "card-assets",
        "card-channel",
        "card-kickoff",
    ]
    assert [card["position"] for card in progress_cards] == [1000, 2000, 3000, 4000, 5000]
    assert [card["position"] for card in todo_cards] == [1000, 2000]

    second_response = client.post(
        "/api/v1/cards/card-budget/move",
        json={"columnId": "col-progress", "position": 0},
    )

    assert second_response.status_code == 200
    moved_again = [
        card for card in second_response.json()["cards"] if card["columnId"] == "col-progress"
    ]
    assert [card["id"] for card in moved_again][:2] == ["card-budget", "card-copy"]


def test_invalid_move_rolls_back_card_order() -> None:
    client = create_test_client()
    sign_in(client)
    before = client.get("/api/v1/board").json()["cards"]

    response = client.post(
        "/api/v1/cards/card-budget/move",
        json={"columnId": "missing-column", "position": 0},
    )

    assert response.status_code == 404
    after = client.get("/api/v1/board").json()["cards"]
    assert after == before


def sign_in(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "user", "password": "password"},
    )
    assert response.status_code == 200


def sqlite_url(path: Path) -> str:
    return f"sqlite:///{path.as_posix()}"
