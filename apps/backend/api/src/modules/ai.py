import json
from collections.abc import Callable, Iterator
from datetime import date
from typing import Annotated, Any, Literal, Protocol, cast
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.config.settings import Settings
from src.database.models import Board, BoardColumn, Card
from src.modules.auth import AuthUser
from src.modules.board import (
    BoardResponse,
    cards_for_column,
    get_board_for_user,
    get_card_on_board,
    get_column_on_board,
    move_card_to_position,
    next_card_position,
    serialize_board,
)

MessageRole = Literal["assistant", "system", "user"]
ConversationRole = Literal["assistant", "user"]
AiActionType = Literal["create_card", "edit_card", "move_card"]


def to_camel(value: str) -> str:
    words = value.split("_")
    return words[0] + "".join(word.capitalize() for word in words[1:])


class AiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class AiVerifyResponse(AiModel):
    ok: bool
    model: str
    message: str


class ChatMessage(AiModel):
    role: MessageRole
    content: str


class AiConversationMessage(AiModel):
    role: ConversationRole
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Conversation message is required.")
        return stripped


class AiChatRequest(AiModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[AiConversationMessage] = Field(default_factory=list, max_length=10)

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Message is required.")
        return stripped


class AiAppliedAction(AiModel):
    type: AiActionType
    card_id: str | None = None
    column_id: str | None = None


class AiChatResponse(AiModel):
    assistant_message: str
    actions: list[AiAppliedAction]
    board: BoardResponse


class AiStructuredModelResponse(AiModel):
    assistant_message: str = Field(min_length=1, max_length=2000)
    actions: list[dict[str, Any]] = Field(default_factory=list, max_length=20)

    @field_validator("assistant_message")
    @classmethod
    def strip_assistant_message(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Assistant message is required.")
        return stripped


class ResponseLike(Protocol):
    def read(self) -> bytes: ...

    def close(self) -> None: ...


class UrlOpen(Protocol):
    def __call__(self, request: Request, /, *, timeout: float) -> ResponseLike: ...


class OpenRouterConfigurationError(Exception):
    pass


class OpenRouterRequestError(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_502_BAD_GATEWAY) -> None:
        super().__init__(message)
        self.status_code = status_code


class OpenRouterInvalidResponseError(OpenRouterRequestError):
    def __init__(self) -> None:
        super().__init__("OpenRouter returned an invalid response.")


class AiActionValidationError(Exception):
    pass


class OpenRouterClient:
    def __init__(
        self,
        settings: Settings,
        url_open: UrlOpen = urlopen,
    ) -> None:
        self._api_key = settings.openrouter_api_key.strip()
        self._model = settings.openrouter_model.strip()
        self._base_url = settings.openrouter_base_url.rstrip("/")
        self._timeout_seconds = max(settings.openrouter_timeout_seconds, 1)
        self._max_retries = max(settings.openrouter_max_retries, 0)
        self._url_open = url_open

    @property
    def model(self) -> str:
        return self._model

    def verify_connectivity(self) -> str:
        return self.create_chat_completion(
            messages=[
                ChatMessage(
                    role="system",
                    content="You are verifying a backend AI provider connection.",
                ),
                ChatMessage(
                    role="user",
                    content='Reply with exactly "ok" and no other text.',
                ),
            ],
            max_tokens=64,
            temperature=0,
        )

    def create_chat_completion(
        self,
        messages: list[ChatMessage],
        max_tokens: int = 150,
        temperature: float = 0.7,
    ) -> str:
        if not self._api_key:
            raise OpenRouterConfigurationError
        if not self._model:
            raise OpenRouterRequestError("OpenRouter model is not configured.")

        payload = {
            "model": self._model,
            "messages": [message.model_dump() for message in messages],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False,
        }
        body = json.dumps(payload).encode("utf-8")
        request = Request(
            f"{self._base_url}/chat/completions",
            data=body,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:8000",
                "X-OpenRouter-Title": "Kanban Board MVP",
            },
            method="POST",
        )

        return self._send_with_retries(request)

    def _send_with_retries(self, request: Request) -> str:
        attempts = self._max_retries + 1
        last_error: OpenRouterRequestError | None = None

        for attempt in range(attempts):
            try:
                return self._send_once(request)
            except OpenRouterRequestError as error:
                if not should_retry(error.status_code) or attempt == attempts - 1:
                    raise
                last_error = error

        if last_error is not None:
            raise last_error
        raise OpenRouterRequestError("OpenRouter request failed.")

    def _send_once(self, request: Request) -> str:
        response: ResponseLike | None = None
        try:
            response = self._url_open(request, timeout=float(self._timeout_seconds))
            body = response.read()
        except HTTPError as error:
            raise parse_http_error(error) from error
        except TimeoutError as error:
            raise OpenRouterRequestError(
                "OpenRouter request timed out.", status.HTTP_504_GATEWAY_TIMEOUT
            ) from error
        except URLError as error:
            raise OpenRouterRequestError("OpenRouter request failed.") from error
        finally:
            if response is not None:
                response.close()

        return extract_message_content(body)


class OpenRouterClientProtocol(Protocol):
    @property
    def model(self) -> str: ...

    def verify_connectivity(self) -> str: ...

    def create_chat_completion(
        self,
        messages: list[ChatMessage],
        max_tokens: int = 150,
        temperature: float = 0.7,
    ) -> str: ...


def create_ai_router(
    settings: Settings,
    get_session: Callable[[], Iterator[Session]],
    require_current_user: Callable[..., AuthUser],
    openrouter_client: OpenRouterClientProtocol | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/api/v1/ai", tags=["ai"])
    DbSession = Annotated[Session, Depends(get_session)]
    CurrentUser = Annotated[AuthUser, Depends(require_current_user)]
    client = openrouter_client or OpenRouterClient(settings)

    @router.post("/verify", response_model=AiVerifyResponse)
    def verify_openrouter(_: CurrentUser) -> AiVerifyResponse:
        try:
            message = client.verify_connectivity()
        except OpenRouterConfigurationError as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenRouter API key is not configured.",
            ) from error
        except OpenRouterRequestError as error:
            raise HTTPException(status_code=error.status_code, detail=str(error)) from error

        return AiVerifyResponse(ok=True, model=client.model, message=message)

    @router.post("/chat", response_model=AiChatResponse)
    def chat_with_ai(
        payload: AiChatRequest,
        db: DbSession,
        current_user: CurrentUser,
    ) -> AiChatResponse:
        current_board = serialize_board(db, get_board_for_user(db, current_user.username))
        db.rollback()

        try:
            raw_response = client.create_chat_completion(
                messages=build_action_prompt(current_board, payload),
                max_tokens=1200,
                temperature=0,
            )
        except OpenRouterConfigurationError as error:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenRouter API key is not configured.",
            ) from error
        except OpenRouterRequestError as error:
            raise HTTPException(status_code=error.status_code, detail=str(error)) from error

        try:
            structured_response = parse_structured_model_response(raw_response)
        except AiActionValidationError as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(error),
            ) from error

        try:
            with db.begin():
                board = get_board_for_user(db, current_user.username)
                applied_actions = apply_ai_actions(db, board, structured_response.actions)
        except AiActionValidationError as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(error),
            ) from error
        except IntegrityError as error:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Unable to apply AI actions because ordering would conflict.",
            ) from error

        return AiChatResponse(
            assistant_message=structured_response.assistant_message,
            actions=applied_actions,
            board=serialize_board(db, get_board_for_user(db, current_user.username)),
        )

    return router


def build_action_prompt(board: BoardResponse, payload: AiChatRequest) -> list[ChatMessage]:
    board_json = json.dumps(board.model_dump(mode="json", by_alias=True), separators=(",", ":"))
    history = payload.history[-6:]
    messages = [
        ChatMessage(
            role="system",
            content=(
                "You are the Kanban board assistant for a local MVP. "
                "Return only valid JSON, with no markdown. The JSON object must have "
                '"assistantMessage" as a string and "actions" as an array. '
                "Allowed actions are exactly: "
                '{"type":"create_card","columnStatusKey":"todo|in_progress|in_review|closed",'
                '"title":"...","description":null|string,"dueDate":null|YYYY-MM-DD}, '
                '{"type":"edit_card","cardId":"...","title":"... optional",'
                '"description":null|string optional,"dueDate":null|YYYY-MM-DD optional}, '
                '{"type":"move_card","cardId":"...","columnStatusKey":"todo|in_progress|in_review|closed",'
                '"position":0 optional}. '
                "You may use columnId instead of columnStatusKey when the id is present "
                "in the board JSON. "
                "Do not create, delete, rename, or reorder columns. Do not delete cards. "
                "If the request is unsupported or ambiguous, return a helpful "
                "assistantMessage and no actions."
            ),
        )
    ]
    for item in history:
        messages.append(ChatMessage(role=item.role, content=item.content))
    messages.append(
        ChatMessage(
            role="user",
            content=f"Current board JSON:\n{board_json}\n\nUser request:\n{payload.message}",
        )
    )
    return messages


def parse_structured_model_response(value: str) -> AiStructuredModelResponse:
    try:
        payload = json.loads(extract_json_object(value))
        return AiStructuredModelResponse.model_validate(payload)
    except (json.JSONDecodeError, ValueError) as error:
        raise AiActionValidationError("AI response was not valid structured JSON.") from error


def extract_json_object(value: str) -> str:
    stripped = value.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if len(lines) >= 3 and lines[0].startswith("```") and lines[-1].strip() == "```":
            stripped = "\n".join(lines[1:-1]).strip()
    if stripped.startswith("{") and stripped.endswith("}"):
        return stripped
    start = stripped.find("{")
    end = stripped.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise AiActionValidationError("AI response was not valid structured JSON.")
    return stripped[start : end + 1]


def apply_ai_actions(
    db: Session,
    board: Board,
    actions: list[dict[str, Any]],
) -> list[AiAppliedAction]:
    applied_actions: list[AiAppliedAction] = []
    for action in actions:
        action_type = require_action_type(action)
        if action_type == "create_card":
            applied_actions.append(apply_create_card_action(db, board, action))
        elif action_type == "edit_card":
            applied_actions.append(apply_edit_card_action(db, board, action))
        elif action_type == "move_card":
            applied_actions.append(apply_move_card_action(db, board, action))
        else:
            raise AiActionValidationError(f"Unsupported AI action: {action_type}.")
    return applied_actions


def require_action_type(action: dict[str, Any]) -> AiActionType:
    action_type = action.get("type")
    if action_type not in {"create_card", "edit_card", "move_card"}:
        raise AiActionValidationError(f"Unsupported AI action: {action_type}.")
    return cast(AiActionType, action_type)


def apply_create_card_action(db: Session, board: Board, action: dict[str, Any]) -> AiAppliedAction:
    reject_unsupported_fields(
        action,
        {"type", "columnId", "columnStatusKey", "title", "description", "dueDate", "position"},
    )
    column = resolve_action_column(db, board, action)
    title = require_text(action.get("title"), "Card title", max_length=120)
    description = optional_text(action.get("description"), "Card description", max_length=600)
    due_date = optional_date(action.get("dueDate"), "Card due date")
    position = optional_position(action.get("position"))
    card = Card(
        id=f"card-{uuid4().hex}",
        board_id=board.id,
        column_id=column.id,
        title=title,
        description=description,
        due_date=due_date,
        position=next_card_position(db, column.id),
    )
    db.add(card)
    db.flush()
    if position is not None:
        move_card_to_position(db, card, column, position)
    return AiAppliedAction(type="create_card", card_id=card.id, column_id=column.id)


def apply_edit_card_action(db: Session, board: Board, action: dict[str, Any]) -> AiAppliedAction:
    reject_unsupported_fields(action, {"type", "cardId", "title", "description", "dueDate"})
    card = get_card_on_board(db, board.id, require_id(action.get("cardId"), "Card id"))
    editable_fields = {"title", "description", "dueDate"} & set(action)
    if not editable_fields:
        raise AiActionValidationError("Edit card action must include an editable field.")
    if "title" in action:
        card.title = require_text(action.get("title"), "Card title", max_length=120)
    if "description" in action:
        card.description = optional_text(
            action.get("description"), "Card description", max_length=600
        )
    if "dueDate" in action:
        card.due_date = optional_date(action.get("dueDate"), "Card due date")
    return AiAppliedAction(type="edit_card", card_id=card.id, column_id=card.column_id)


def apply_move_card_action(db: Session, board: Board, action: dict[str, Any]) -> AiAppliedAction:
    reject_unsupported_fields(action, {"type", "cardId", "columnId", "columnStatusKey", "position"})
    card = get_card_on_board(db, board.id, require_id(action.get("cardId"), "Card id"))
    column = resolve_action_column(db, board, action)
    position = optional_position(action.get("position"))
    if position is None:
        target_count = len([item for item in cards_for_column(db, column.id) if item.id != card.id])
        position = target_count
    move_card_to_position(db, card, column, position)
    return AiAppliedAction(type="move_card", card_id=card.id, column_id=column.id)


def reject_unsupported_fields(action: dict[str, Any], allowed_fields: set[str]) -> None:
    extra_fields = set(action) - allowed_fields
    if extra_fields:
        field_list = ", ".join(sorted(extra_fields))
        raise AiActionValidationError(f"Unsupported AI action field: {field_list}.")


def resolve_action_column(db: Session, board: Board, action: dict[str, Any]) -> BoardColumn:
    column_id = action.get("columnId")
    status_key = action.get("columnStatusKey")
    if column_id is not None and status_key is not None:
        raise AiActionValidationError("Use either columnId or columnStatusKey, not both.")
    if isinstance(column_id, str) and column_id.strip():
        return get_column_on_board(db, board.id, column_id.strip())
    if isinstance(status_key, str) and status_key.strip():
        normalized_status_key = status_key.strip()
        for column in board.columns:
            if column.status_key == normalized_status_key:
                return get_column_on_board(db, board.id, column.id)
        raise AiActionValidationError(f"Unknown column status key: {normalized_status_key}.")
    raise AiActionValidationError("AI action must include columnId or columnStatusKey.")


def require_id(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise AiActionValidationError(f"{label} is required.")
    return value.strip()


def require_text(value: object, label: str, max_length: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise AiActionValidationError(f"{label} is required.")
    stripped = value.strip()
    if len(stripped) > max_length:
        raise AiActionValidationError(f"{label} must be {max_length} characters or fewer.")
    return stripped


def optional_text(value: object, label: str, max_length: int) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise AiActionValidationError(f"{label} must be text or null.")
    stripped = value.strip()
    if not stripped:
        return None
    if len(stripped) > max_length:
        raise AiActionValidationError(f"{label} must be {max_length} characters or fewer.")
    return stripped


def optional_date(value: object, label: str) -> date | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise AiActionValidationError(f"{label} must be YYYY-MM-DD or null.")
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise AiActionValidationError(f"{label} must be YYYY-MM-DD or null.") from error


def optional_position(value: object) -> int | None:
    if value is None:
        return None
    if not isinstance(value, int) or value < 0:
        raise AiActionValidationError("Card position must be a non-negative integer.")
    return value


def extract_message_content(body: bytes) -> str:
    try:
        payload = json.loads(body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise OpenRouterInvalidResponseError from error

    if not isinstance(payload, dict):
        raise OpenRouterInvalidResponseError

    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise OpenRouterInvalidResponseError

    first_choice = choices[0]
    if not isinstance(first_choice, dict):
        raise OpenRouterInvalidResponseError

    message = first_choice.get("message")
    if not isinstance(message, dict):
        raise OpenRouterInvalidResponseError

    content = message.get("content")
    if isinstance(content, str) and content.strip():
        return content.strip()

    raise OpenRouterInvalidResponseError


def parse_http_error(error: HTTPError) -> OpenRouterRequestError:
    message = provider_error_message(error)
    status_code = map_provider_status(error.code)
    return OpenRouterRequestError(message, status_code)


def provider_error_message(error: HTTPError) -> str:
    try:
        body = error.read()
        payload: Any = json.loads(body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        payload = None

    error_type = None
    if isinstance(payload, dict):
        error_payload = payload.get("error")
        if isinstance(error_payload, dict):
            error_type_value = error_payload.get("error_type") or error_payload.get("type")
            if isinstance(error_type_value, str):
                error_type = error_type_value

    if error.code in {401, 403} or error_type == "authentication":
        return "OpenRouter authentication failed."
    if error.code == 429 or error_type == "rate_limit_exceeded":
        return "OpenRouter rate limit was exceeded."
    if error_type == "context_length_exceeded":
        return "OpenRouter rejected the request because it was too large."
    if error_type in {"provider_overloaded", "provider_unavailable", "server"}:
        return "OpenRouter provider is temporarily unavailable."
    if error_type == "timeout":
        return "OpenRouter request timed out."
    if 500 <= error.code < 600:
        return "OpenRouter provider is temporarily unavailable."
    return "OpenRouter request failed."


def map_provider_status(provider_status: int) -> int:
    if provider_status in {401, 403}:
        return status.HTTP_502_BAD_GATEWAY
    if provider_status == 429:
        return status.HTTP_429_TOO_MANY_REQUESTS
    if provider_status in {408, 504}:
        return status.HTTP_504_GATEWAY_TIMEOUT
    if 500 <= provider_status < 600:
        return status.HTTP_502_BAD_GATEWAY
    return status.HTTP_400_BAD_REQUEST


def should_retry(status_code: int) -> bool:
    return status_code in {
        status.HTTP_502_BAD_GATEWAY,
        status.HTTP_503_SERVICE_UNAVAILABLE,
        status.HTTP_504_GATEWAY_TIMEOUT,
    }
