import json
from collections.abc import Callable, Iterator
from datetime import date, datetime
from typing import Annotated, Literal, cast
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.database.init import POSITION_GAP
from src.database.models import Board, BoardColumn, Card, User
from src.modules.auth import AuthUser

StatusKey = Literal["todo", "in_progress", "in_review", "closed"]
CoverVariant = Literal["none", "soft-gradient", "shadow", "waves"]


def to_camel(value: str) -> str:
    words = value.split("_")
    return words[0] + "".join(word.capitalize() for word in words[1:])


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class BoardColumnResponse(ApiModel):
    id: str
    status_key: StatusKey
    name: str
    position: int


class BoardCardResponse(ApiModel):
    id: str
    column_id: str
    title: str
    description: str | None = None
    due_date: date | None = None
    position: int
    assignee_initials: list[str]
    subtask_count: int
    attachment_count: int
    flagged: bool
    cover_variant: CoverVariant
    created_at: datetime
    updated_at: datetime


class BoardResponse(ApiModel):
    id: str
    name: str
    columns: list[BoardColumnResponse]
    cards: list[BoardCardResponse]


class RenameColumnRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Column name is required.")
        return stripped


class CardCreateRequest(ApiModel):
    column_id: str
    title: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=600)
    due_date: date | None = None
    assignee_initials: list[str] = Field(default_factory=list, max_length=5)
    subtask_count: int = Field(default=0, ge=0)
    attachment_count: int = Field(default=0, ge=0)
    flagged: bool = False
    cover_variant: CoverVariant = "none"

    @field_validator("title")
    @classmethod
    def strip_title(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Card title is required.")
        return stripped

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("assignee_initials")
    @classmethod
    def normalize_initials(cls, value: list[str]) -> list[str]:
        normalized = [initials.strip().upper() for initials in value if initials.strip()]
        if any(len(initials) > 4 for initials in normalized):
            raise ValueError("Assignee initials must be 4 characters or fewer.")
        return normalized


class CardUpdateRequest(ApiModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=600)
    due_date: date | None = None
    assignee_initials: list[str] | None = Field(default=None, max_length=5)
    subtask_count: int | None = Field(default=None, ge=0)
    attachment_count: int | None = Field(default=None, ge=0)
    flagged: bool | None = None
    cover_variant: CoverVariant | None = None

    _strip_title = field_validator("title")(CardCreateRequest.strip_title)
    _strip_description = field_validator("description")(CardCreateRequest.strip_description)
    _normalize_initials = field_validator("assignee_initials")(CardCreateRequest.normalize_initials)


class MoveCardRequest(ApiModel):
    column_id: str
    position: int = Field(ge=0)


def create_board_router(
    get_session: Callable[[], Iterator[Session]],
    require_current_user: Callable[..., AuthUser],
) -> APIRouter:
    router = APIRouter(prefix="/api/v1", tags=["board"])
    DbSession = Annotated[Session, Depends(get_session)]
    CurrentUser = Annotated[AuthUser, Depends(require_current_user)]

    @router.get("/board", response_model=BoardResponse)
    def read_board(db: DbSession, current_user: CurrentUser) -> BoardResponse:
        board = get_board_for_user(db, current_user.username)
        return serialize_board(db, board)

    @router.patch("/columns/{column_id}", response_model=BoardColumnResponse)
    def rename_column(
        column_id: str,
        payload: RenameColumnRequest,
        db: DbSession,
        current_user: CurrentUser,
    ) -> BoardColumnResponse:
        with db.begin():
            column = get_column_for_user(db, current_user.username, column_id)
            column.name = payload.name
        db.refresh(column)
        return serialize_column(column)

    @router.post(
        "/cards",
        response_model=BoardCardResponse,
        status_code=status.HTTP_201_CREATED,
    )
    def create_card(
        payload: CardCreateRequest,
        db: DbSession,
        current_user: CurrentUser,
    ) -> BoardCardResponse:
        with db.begin():
            board = get_board_for_user(db, current_user.username)
            column = get_column_on_board(db, board.id, payload.column_id)
            position = next_card_position(db, column.id)
            card = Card(
                id=f"card-{uuid4().hex}",
                board_id=board.id,
                column_id=column.id,
                title=payload.title,
                description=payload.description,
                due_date=payload.due_date,
                position=position,
                assignee_initials=json.dumps(payload.assignee_initials, separators=(",", ":")),
                subtask_count=payload.subtask_count,
                attachment_count=payload.attachment_count,
                flagged=payload.flagged,
                cover_variant=payload.cover_variant,
            )
            db.add(card)
        db.refresh(card)
        return serialize_card(card)

    @router.get("/cards/{card_id}", response_model=BoardCardResponse)
    def read_card(card_id: str, db: DbSession, current_user: CurrentUser) -> BoardCardResponse:
        return serialize_card(get_card_for_user(db, current_user.username, card_id))

    @router.patch("/cards/{card_id}", response_model=BoardCardResponse)
    def update_card(
        card_id: str,
        payload: CardUpdateRequest,
        db: DbSession,
        current_user: CurrentUser,
    ) -> BoardCardResponse:
        with db.begin():
            card = get_card_for_user(db, current_user.username, card_id)
            updates = payload.model_dump(exclude_unset=True)
            if "title" in updates:
                if payload.title is None:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Card title is required.",
                    )
                card.title = payload.title
            if "description" in updates:
                card.description = payload.description
            if "due_date" in updates:
                card.due_date = payload.due_date
            if "assignee_initials" in updates:
                card.assignee_initials = json.dumps(
                    payload.assignee_initials or [], separators=(",", ":")
                )
            if "subtask_count" in updates and payload.subtask_count is not None:
                card.subtask_count = payload.subtask_count
            if "attachment_count" in updates and payload.attachment_count is not None:
                card.attachment_count = payload.attachment_count
            if "flagged" in updates and payload.flagged is not None:
                card.flagged = payload.flagged
            if "cover_variant" in updates and payload.cover_variant is not None:
                card.cover_variant = payload.cover_variant
        db.refresh(card)
        return serialize_card(card)

    @router.post("/cards/{card_id}/move", response_model=BoardResponse)
    def move_card(
        card_id: str,
        payload: MoveCardRequest,
        db: DbSession,
        current_user: CurrentUser,
    ) -> BoardResponse:
        try:
            with db.begin():
                board = get_board_for_user(db, current_user.username)
                card = get_card_on_board(db, board.id, card_id)
                target_column = get_column_on_board(db, board.id, payload.column_id)
                move_card_to_position(db, card, target_column, payload.position)
        except IntegrityError as error:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Unable to move card because ordering would conflict.",
            ) from error

        return serialize_board(db, get_board_for_user(db, current_user.username))

    return router


def get_board_for_user(db: Session, username: str) -> Board:
    board = db.scalar(select(Board).join(User).where(User.username == username))
    if board is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found.")
    return board


def get_column_for_user(db: Session, username: str, column_id: str) -> BoardColumn:
    column = db.scalar(
        select(BoardColumn)
        .join(Board)
        .join(User)
        .where(User.username == username, BoardColumn.id == column_id)
    )
    if column is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Column not found.")
    return column


def get_column_on_board(db: Session, board_id: str, column_id: str) -> BoardColumn:
    column = db.scalar(
        select(BoardColumn).where(BoardColumn.board_id == board_id, BoardColumn.id == column_id)
    )
    if column is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Column not found.")
    return column


def get_card_for_user(db: Session, username: str, card_id: str) -> Card:
    card = db.scalar(
        select(Card).join(Board).join(User).where(User.username == username, Card.id == card_id)
    )
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found.")
    return card


def get_card_on_board(db: Session, board_id: str, card_id: str) -> Card:
    card = db.scalar(select(Card).where(Card.board_id == board_id, Card.id == card_id))
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found.")
    return card


def next_card_position(db: Session, column_id: str) -> int:
    cards = cards_for_column(db, column_id)
    if not cards:
        return POSITION_GAP
    return cards[-1].position + POSITION_GAP


def move_card_to_position(
    db: Session,
    card: Card,
    target_column: BoardColumn,
    target_index: int,
) -> None:
    source_column_id = card.column_id
    source_cards = [
        existing for existing in cards_for_column(db, source_column_id) if existing.id != card.id
    ]
    target_cards = (
        source_cards
        if target_column.id == source_column_id
        else cards_for_column(db, target_column.id)
    )

    bounded_index = min(target_index, len(target_cards))
    target_cards.insert(bounded_index, card)

    affected_cards = list(
        {existing.id: existing for existing in [*source_cards, *target_cards]}.values()
    )
    temporary_base = (
        max((existing.position for existing in affected_cards), default=0)
        + POSITION_GAP * (len(affected_cards) + 1)
    )
    for index, existing in enumerate(affected_cards, start=1):
        existing.position = temporary_base + index * POSITION_GAP
    db.flush()

    for index, existing in enumerate(target_cards, start=1):
        existing.column_id = target_column.id
        existing.position = index * POSITION_GAP

    if target_column.id != source_column_id:
        for index, existing in enumerate(source_cards, start=1):
            existing.position = index * POSITION_GAP


def cards_for_column(db: Session, column_id: str) -> list[Card]:
    return list(
        db.scalars(
            select(Card)
            .where(Card.column_id == column_id)
            .order_by(Card.position, Card.created_at, Card.id)
        )
    )


def serialize_board(db: Session, board: Board) -> BoardResponse:
    columns = list(
        db.scalars(
            select(BoardColumn)
            .where(BoardColumn.board_id == board.id)
            .order_by(BoardColumn.position, BoardColumn.id)
        )
    )
    cards = list(
        db.scalars(
            select(Card)
            .join(BoardColumn, Card.column_id == BoardColumn.id)
            .where(Card.board_id == board.id)
            .order_by(BoardColumn.position, Card.position, Card.created_at, Card.id)
        )
    )
    return BoardResponse(
        id=board.id,
        name=board.name,
        columns=[serialize_column(column) for column in columns],
        cards=[serialize_card(card) for card in cards],
    )


def serialize_column(column: BoardColumn) -> BoardColumnResponse:
    return BoardColumnResponse(
        id=column.id,
        status_key=cast(StatusKey, column.status_key),
        name=column.name,
        position=column.position,
    )


def serialize_card(card: Card) -> BoardCardResponse:
    return BoardCardResponse(
        id=card.id,
        column_id=card.column_id,
        title=card.title,
        description=card.description,
        due_date=card.due_date,
        position=card.position,
        assignee_initials=parse_initials(card.assignee_initials),
        subtask_count=card.subtask_count,
        attachment_count=card.attachment_count,
        flagged=card.flagged,
        cover_variant=cast(CoverVariant, card.cover_variant),
        created_at=card.created_at,
        updated_at=card.updated_at,
    )


def parse_initials(value: str) -> list[str]:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [item for item in parsed if isinstance(item, str)]
