import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict

from src.config.settings import Settings

SESSION_COOKIE_NAME = "kanban_session"
SESSION_LIFETIME_SECONDS = 60 * 60 * 8


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthUser(BaseModel):
    username: str


class AuthSessionResponse(BaseModel):
    user: AuthUser

    model_config = ConfigDict(populate_by_name=True, alias_generator=None)


class AuthService:
    def __init__(self, settings: Settings, session_secret: str) -> None:
        self._settings = settings
        self._session_secret = session_secret

    def authenticate(self, username: str, password: str) -> AuthUser | None:
        username_matches = secrets.compare_digest(username, self._settings.dummy_username)
        password_matches = secrets.compare_digest(password, self._settings.dummy_password)
        if username_matches and password_matches:
            return AuthUser(username=self._settings.dummy_username)
        return None

    def create_token(self, user: AuthUser) -> str:
        payload = {
            "sub": user.username,
            "exp": int(time.time()) + SESSION_LIFETIME_SECONDS,
        }
        encoded_payload = _base64url_encode(
            json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        )
        signature = self._sign(encoded_payload)
        return f"{encoded_payload}.{signature}"

    def read_user(self, token: str | None) -> AuthUser | None:
        if not token:
            return None

        parts = token.split(".")
        if len(parts) != 2:
            return None

        encoded_payload, signature = parts
        expected_signature = self._sign(encoded_payload)
        if not secrets.compare_digest(signature, expected_signature):
            return None

        try:
            payload = json.loads(_base64url_decode(encoded_payload))
        except (json.JSONDecodeError, ValueError):
            return None

        subject = payload.get("sub")
        expires_at = payload.get("exp")
        if subject != self._settings.dummy_username:
            return None
        if not isinstance(expires_at, int) or expires_at < int(time.time()):
            return None
        return AuthUser(username=subject)

    def _sign(self, encoded_payload: str) -> str:
        digest = hmac.new(
            self._session_secret.encode("utf-8"),
            encoded_payload.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        return _base64url_encode(digest)


def create_auth_router(settings: Settings, session_secret: str) -> APIRouter:
    router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
    auth_service = AuthService(settings=settings, session_secret=session_secret)

    def require_current_user(request: Request) -> AuthUser:
        user = auth_service.read_user(request.cookies.get(SESSION_COOKIE_NAME))
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required.",
            )
        return user

    @router.post("/login", response_model=AuthSessionResponse)
    def login(payload: LoginRequest, response: Response) -> AuthSessionResponse:
        user = auth_service.authenticate(payload.username, payload.password)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
            )

        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=auth_service.create_token(user),
            max_age=SESSION_LIFETIME_SECONDS,
            httponly=True,
            secure=settings.app_env == "production",
            samesite="lax",
            path="/",
        )
        return AuthSessionResponse(user=user)

    @router.get("/me", response_model=AuthSessionResponse)
    def read_current_user(
        user: Annotated[AuthUser, Depends(require_current_user)],
    ) -> AuthSessionResponse:
        return AuthSessionResponse(user=user)

    @router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
    def logout(response: Response) -> None:
        response.delete_cookie(
            key=SESSION_COOKIE_NAME,
            httponly=True,
            secure=settings.app_env == "production",
            samesite="lax",
            path="/",
        )

    return router


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _base64url_decode(value: str) -> str:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}").decode("utf-8")
