import json
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request

from fastapi.testclient import TestClient

from src.app import create_app
from src.config.settings import Settings
from src.modules.ai import (
    ChatMessage,
    OpenRouterClient,
    OpenRouterClientProtocol,
    OpenRouterRequestError,
)


def create_test_client(
    database_url: str = "sqlite:///:memory:",
    openrouter_client: OpenRouterClientProtocol | None = None,
    openrouter_api_key: str = "",
) -> TestClient:
    return TestClient(
        create_app(
            Settings(
                app_env="development",
                database_url=database_url,
                session_secret="test-session-secret",
                cors_origins="http://localhost:3000",
                openrouter_api_key=openrouter_api_key,
            ),
            openrouter_client=openrouter_client,
        )
    )


def test_root_serves_frontend_or_development_fallback() -> None:
    client = create_test_client()

    response = client.get("/")

    assert response.status_code == 200
    assert "Kanban Board MVP" in response.text or "<html" in response.text


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


def test_ai_verify_requires_session() -> None:
    client = create_test_client(openrouter_client=FakeOpenRouterClient("ok"))

    response = client.post("/api/v1/ai/verify")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required."}


def test_ai_verify_reports_missing_openrouter_configuration() -> None:
    client = create_test_client()
    sign_in(client)

    response = client.post("/api/v1/ai/verify")

    assert response.status_code == 503
    assert response.json() == {"detail": "OpenRouter API key is not configured."}


def test_ai_verify_uses_mocked_openrouter_client() -> None:
    fake_client = FakeOpenRouterClient("ok")
    client = create_test_client(openrouter_client=fake_client)
    sign_in(client)

    response = client.post("/api/v1/ai/verify")

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "model": "openai/gpt-oss-120b",
        "message": "ok",
    }
    assert fake_client.calls == 1


def test_ai_verify_returns_safe_provider_error_without_api_key() -> None:
    client = create_test_client(
        openrouter_client=FakeOpenRouterClient(
            OpenRouterRequestError("OpenRouter authentication failed.")
        )
    )
    sign_in(client)

    response = client.post("/api/v1/ai/verify")

    assert response.status_code == 502
    assert response.json() == {"detail": "OpenRouter authentication failed."}


def test_ai_chat_returns_message_without_changing_board() -> None:
    fake_client = FakeOpenRouterClient(
        chat_responses=[
            {
                "assistantMessage": "I can help with that, but I did not change the board.",
                "actions": [],
            }
        ]
    )
    client = create_test_client(openrouter_client=fake_client)
    sign_in(client)
    before = client.get("/api/v1/board").json()

    response = client.post(
        "/api/v1/ai/chat",
        json={
            "message": "What is on the board?",
            "history": [{"role": "user", "content": "Earlier context"}],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["assistantMessage"] == "I can help with that, but I did not change the board."
    assert payload["actions"] == []
    assert payload["board"] == before
    assert "Current board JSON" in fake_client.chat_messages[0][-1].content
    assert any(message.content == "Earlier context" for message in fake_client.chat_messages[0])


def test_ai_chat_creates_card_from_valid_action() -> None:
    client = create_test_client(
        openrouter_client=FakeOpenRouterClient(
            chat_responses=[
                {
                    "assistantMessage": "Created the launch QA task.",
                    "actions": [
                        {
                            "type": "create_card",
                            "columnStatusKey": "todo",
                            "title": "Prepare launch QA",
                            "description": "Check the release checklist.",
                            "dueDate": "2026-09-10",
                        }
                    ],
                }
            ]
        )
    )
    sign_in(client)

    response = client.post("/api/v1/ai/chat", json={"message": "Create a launch QA task."})

    assert response.status_code == 200
    payload = response.json()
    assert payload["actions"][0]["type"] == "create_card"
    assert payload["actions"][0]["columnId"] == "col-todo"
    created_cards = [
        card for card in payload["board"]["cards"] if card["title"] == "Prepare launch QA"
    ]
    assert len(created_cards) == 1
    assert created_cards[0]["columnId"] == "col-todo"
    assert created_cards[0]["dueDate"] == "2026-09-10"


def test_ai_chat_applies_multi_card_edit_and_move_transactionally() -> None:
    client = create_test_client(
        openrouter_client=FakeOpenRouterClient(
            chat_responses=[
                {
                    "assistantMessage": "Updated and moved the budget task.",
                    "actions": [
                        {
                            "type": "edit_card",
                            "cardId": "card-budget",
                            "title": "Confirm final budgets",
                            "description": None,
                        },
                        {
                            "type": "move_card",
                            "cardId": "card-budget",
                            "columnStatusKey": "in_progress",
                            "position": 1,
                        },
                    ],
                }
            ]
        )
    )
    sign_in(client)

    response = client.post("/api/v1/ai/chat", json={"message": "Update and move budget."})

    assert response.status_code == 200
    board = response.json()["board"]
    budget = next(card for card in board["cards"] if card["id"] == "card-budget")
    assert budget["title"] == "Confirm final budgets"
    assert budget["description"] is None
    assert budget["columnId"] == "col-progress"
    progress_cards = [card for card in board["cards"] if card["columnId"] == "col-progress"]
    assert [card["id"] for card in progress_cards][:2] == ["card-copy", "card-budget"]


def test_ai_chat_rejects_unsupported_actions_without_changing_board() -> None:
    client = create_test_client(
        openrouter_client=FakeOpenRouterClient(
            chat_responses=[
                {
                    "assistantMessage": "I cannot delete columns.",
                    "actions": [{"type": "delete_column", "columnStatusKey": "todo"}],
                }
            ]
        )
    )
    sign_in(client)
    before = client.get("/api/v1/board").json()["cards"]

    response = client.post("/api/v1/ai/chat", json={"message": "Delete To Do."})

    assert response.status_code == 422
    assert response.json() == {"detail": "Unsupported AI action: delete_column."}
    assert client.get("/api/v1/board").json()["cards"] == before


def test_ai_chat_rejects_ambiguous_card_edits_without_card_id() -> None:
    client = create_test_client(
        openrouter_client=FakeOpenRouterClient(
            chat_responses=[
                {
                    "assistantMessage": "The request is ambiguous.",
                    "actions": [
                        {
                            "type": "edit_card",
                            "title": "Confirm budgets",
                            "description": "Ambiguous target",
                        }
                    ],
                }
            ]
        )
    )
    sign_in(client)

    response = client.post("/api/v1/ai/chat", json={"message": "Update the budget card."})

    assert response.status_code == 422
    assert response.json() == {"detail": "Card id is required."}


def test_ai_chat_rolls_back_failed_multi_action_response() -> None:
    client = create_test_client(
        openrouter_client=FakeOpenRouterClient(
            chat_responses=[
                {
                    "assistantMessage": "This should fail as a unit.",
                    "actions": [
                        {
                            "type": "create_card",
                            "columnStatusKey": "todo",
                            "title": "Rollback task",
                        },
                        {
                            "type": "move_card",
                            "cardId": "missing-card",
                            "columnStatusKey": "closed",
                        },
                    ],
                }
            ]
        )
    )
    sign_in(client)
    before = client.get("/api/v1/board").json()["cards"]

    response = client.post("/api/v1/ai/chat", json={"message": "Create and move."})

    assert response.status_code == 404
    after = client.get("/api/v1/board").json()["cards"]
    assert after == before
    assert all(card["title"] != "Rollback task" for card in after)


def test_ai_chat_uses_stable_status_key_after_column_rename() -> None:
    client = create_test_client(
        openrouter_client=FakeOpenRouterClient(
            chat_responses=[
                {
                    "assistantMessage": "Moved the copy task to the renamed To Do column.",
                    "actions": [
                        {
                            "type": "move_card",
                            "cardId": "card-copy",
                            "columnStatusKey": "todo",
                            "position": 0,
                        }
                    ],
                }
            ]
        )
    )
    sign_in(client)
    assert client.patch("/api/v1/columns/col-todo", json={"name": "Backlog"}).status_code == 200

    response = client.post("/api/v1/ai/chat", json={"message": "Move copy to Backlog."})

    assert response.status_code == 200
    board = response.json()["board"]
    assert board["columns"][0]["name"] == "Backlog"
    moved_card = next(card for card in board["cards"] if card["id"] == "card-copy")
    assert moved_card["columnId"] == "col-todo"
    assert moved_card["position"] == 1000


def test_ai_chat_rejects_invalid_model_json_without_changing_board() -> None:
    client = create_test_client(openrouter_client=FakeOpenRouterClient(chat_responses=["not json"]))
    sign_in(client)
    before = client.get("/api/v1/board").json()["cards"]

    response = client.post("/api/v1/ai/chat", json={"message": "Please help."})

    assert response.status_code == 422
    assert response.json() == {"detail": "AI response was not valid structured JSON."}
    assert client.get("/api/v1/board").json()["cards"] == before


def test_openrouter_client_sends_expected_chat_completion_request() -> None:
    captured: dict[str, Any] = {}

    def fake_url_open(request: Request, *, timeout: float) -> FakeUrlResponse:
        captured["url"] = request.full_url
        captured["timeout"] = timeout
        captured["headers"] = dict(request.header_items())
        captured["body"] = json_body(request)
        return FakeUrlResponse(
            b'{"choices":[{"message":{"role":"assistant","content":"ok"}}]}'
        )

    client = OpenRouterClient(
        Settings(openrouter_api_key="test-secret", openrouter_timeout_seconds=7),
        url_open=fake_url_open,
    )

    response = client.verify_connectivity()

    assert response == "ok"
    assert captured["url"] == "https://openrouter.ai/api/v1/chat/completions"
    assert captured["timeout"] == 7.0
    assert captured["headers"]["Authorization"] == "Bearer test-secret"
    assert captured["body"]["model"] == "openai/gpt-oss-120b"
    assert captured["body"]["stream"] is False
    assert captured["body"]["messages"][0]["role"] == "system"


def test_openrouter_client_retries_temporary_provider_errors() -> None:
    calls = 0

    def fake_url_open(_: Request, *, timeout: float) -> FakeUrlResponse:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise HTTPError(
                url="https://openrouter.ai/api/v1/chat/completions",
                code=503,
                msg="Service unavailable",
                hdrs=cast_any({}),
                fp=BytesIO(
                    b'{"type":"error","error":{"error_type":"provider_unavailable"}}'
                ),
            )
        return FakeUrlResponse(
            b'{"choices":[{"message":{"role":"assistant","content":"ok"}}]}'
        )

    client = OpenRouterClient(
        Settings(openrouter_api_key="test-secret", openrouter_max_retries=1),
        url_open=fake_url_open,
    )

    assert client.verify_connectivity() == "ok"
    assert calls == 2


def test_openrouter_client_rejects_malformed_provider_response() -> None:
    client = OpenRouterClient(
        Settings(openrouter_api_key="test-secret"),
        url_open=lambda _request, *, timeout: FakeUrlResponse(b'{"choices":[]}'),
    )

    try:
        client.verify_connectivity()
    except OpenRouterRequestError as error:
        assert str(error) == "OpenRouter returned an invalid response."
    else:
        raise AssertionError("Expected malformed OpenRouter response to fail.")


def sign_in(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "user", "password": "password"},
    )
    assert response.status_code == 200


def sqlite_url(path: Path) -> str:
    return f"sqlite:///{path.as_posix()}"


class FakeOpenRouterClient:
    model = "openai/gpt-oss-120b"

    def __init__(
        self,
        result: str | OpenRouterRequestError = "ok",
        chat_responses: list[str | dict[str, object]] | None = None,
    ) -> None:
        self._result = result
        self._chat_responses = list(chat_responses or [])
        self.calls = 0
        self.chat_messages: list[list[ChatMessage]] = []

    def verify_connectivity(self) -> str:
        self.calls += 1
        if isinstance(self._result, OpenRouterRequestError):
            raise self._result
        return self._result

    def create_chat_completion(
        self,
        messages: list[ChatMessage],
        max_tokens: int = 150,
        temperature: float = 0.7,
    ) -> str:
        self.chat_messages.append(messages)
        if not self._chat_responses:
            return '{"assistantMessage":"No changes needed.","actions":[]}'
        response = self._chat_responses.pop(0)
        if isinstance(response, str):
            return response
        return json.dumps(response)


class FakeUrlResponse:
    def __init__(self, body: bytes) -> None:
        self._body = body
        self.closed = False

    def read(self) -> bytes:
        return self._body

    def close(self) -> None:
        self.closed = True


def json_body(request: Request) -> dict[str, Any]:
    data = request.data
    assert isinstance(data, bytes)
    payload = json.loads(data.decode("utf-8"))
    assert isinstance(payload, dict)
    return payload


def cast_any(value: object) -> Any:
    return value
