import json
from collections.abc import Callable
from typing import Annotated, Any, Literal, Protocol
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict

from src.config.settings import Settings
from src.modules.auth import AuthUser

MessageRole = Literal["assistant", "system", "user"]


class AiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class AiVerifyResponse(AiModel):
    ok: bool
    model: str
    message: str


class ChatMessage(AiModel):
    role: MessageRole
    content: str


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
                    content='Reply with exactly "ok" if you can read this message.',
                ),
            ],
            max_tokens=8,
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


def create_ai_router(
    settings: Settings,
    require_current_user: Callable[..., AuthUser],
    openrouter_client: OpenRouterClientProtocol | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/api/v1/ai", tags=["ai"])
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

    return router


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
