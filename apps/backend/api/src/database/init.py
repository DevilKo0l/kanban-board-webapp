import json
from datetime import date
from typing import Any, cast

from sqlalchemy import select
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from src.config.settings import Settings
from src.database.models import Base, Board, BoardColumn, Card, User

POSITION_GAP = 1000

FIXED_COLUMNS = [
    {"id": "col-todo", "status_key": "todo", "name": "To Do", "position": 1000},
    {
        "id": "col-progress",
        "status_key": "in_progress",
        "name": "In Progress",
        "position": 2000,
    },
    {"id": "col-review", "status_key": "in_review", "name": "In Review", "position": 3000},
    {"id": "col-closed", "status_key": "closed", "name": "Closed", "position": 4000},
]

DEMO_CARDS: list[dict[str, Any]] = [
    {
        "id": "card-brief",
        "column_id": "col-todo",
        "title": "Finalize campaign brief",
        "description": "Tighten the positioning notes before the kickoff review.",
        "position": 1000,
        "assignee_initials": ["ML", "JR"],
        "subtask_count": 4,
    },
    {
        "id": "card-research",
        "column_id": "col-todo",
        "title": "Audience and market research",
        "description": "Summarize competitor offers and customer segments.",
        "position": 2000,
        "flagged": True,
    },
    {
        "id": "card-budget",
        "column_id": "col-todo",
        "title": "Confirm budgets",
        "description": "Validate paid channel budget ranges with finance.",
        "position": 3000,
        "assignee_initials": ["AC", "DN"],
        "subtask_count": 4,
    },
    {
        "id": "card-copy",
        "column_id": "col-progress",
        "title": "Draft campaign messaging and copy",
        "description": "Create first-pass copy blocks for the landing page.",
        "position": 1000,
        "flagged": True,
    },
    {
        "id": "card-assets",
        "column_id": "col-progress",
        "title": "Finalize asset list and bill of material",
        "description": "Collect required creative, media, and placement assets.",
        "due_date": "2026-08-24",
        "position": 2000,
        "assignee_initials": ["SP", "IM"],
        "subtask_count": 4,
    },
    {
        "id": "card-channel",
        "column_id": "col-progress",
        "title": "Define channel strategy",
        "description": "Prioritize launch channels and identify owners.",
        "position": 3000,
        "assignee_initials": ["NO", "LV"],
        "cover_variant": "shadow",
    },
    {
        "id": "card-kickoff",
        "column_id": "col-progress",
        "title": "Schedule kickoff meeting",
        "description": "Find the launch planning slot and attach agenda notes.",
        "position": 4000,
        "flagged": True,
    },
    {
        "id": "card-review",
        "column_id": "col-review",
        "title": "Review launch readiness checklist",
        "description": "Check owners, due dates, risk notes, and handoffs.",
        "position": 1000,
        "assignee_initials": ["QS"],
        "subtask_count": 3,
        "attachment_count": 1,
    },
    {
        "id": "card-beta",
        "column_id": "col-closed",
        "title": "Customer beta interviews",
        "description": "Interview notes are summarized for the launch team.",
        "position": 1000,
        "assignee_initials": ["ML", "JR"],
        "subtask_count": 4,
    },
    {
        "id": "card-support",
        "column_id": "col-closed",
        "title": "Field marketing support plan",
        "description": "Regional enablement plan is ready for distribution.",
        "position": 2000,
        "assignee_initials": ["KP", "RS", "IM"],
        "cover_variant": "waves",
    },
    {
        "id": "card-user-research",
        "column_id": "col-closed",
        "title": "User Research",
        "description": "Research synthesis has been shared with the product team.",
        "position": 3000,
        "flagged": True,
    },
    {
        "id": "card-interview-process",
        "column_id": "col-closed",
        "title": "Customer interview process",
        "description": "Interview guide and consent steps are documented.",
        "position": 4000,
        "attachment_count": 1,
        "flagged": True,
    },
]


def initialize_database(
    engine: Engine,
    session_factory: sessionmaker[Session],
    settings: Settings,
) -> None:
    Base.metadata.create_all(engine)

    with session_factory() as session:
        with session.begin():
            user = session.scalar(select(User).where(User.username == settings.dummy_username))
            if user is None:
                user = User(id="user-mvp", username=settings.dummy_username)
                session.add(user)
                session.flush()

            board = session.scalar(select(Board).where(Board.user_id == user.id))
            if board is None:
                board = Board(id=f"board-{user.id}", user_id=user.id, name="Launch Plan")
                session.add(board)
                session.flush()

            for column_seed in FIXED_COLUMNS:
                column = session.scalar(
                    select(BoardColumn).where(
                        BoardColumn.board_id == board.id,
                        BoardColumn.status_key == column_seed["status_key"],
                    )
                )
                if column is None:
                    session.add(BoardColumn(board_id=board.id, **column_seed))

            session.flush()
            card_count = len(session.scalars(select(Card).where(Card.board_id == board.id)).all())
            if card_count == 0:
                for card_seed in DEMO_CARDS:
                    session.add(
                        Card(
                            board_id=board.id,
                            column_id=str(card_seed["column_id"]),
                            title=str(card_seed["title"]),
                            description=str(card_seed["description"]),
                            due_date=parse_seed_date(card_seed.get("due_date")),
                            position=seed_int(card_seed["position"]),
                            assignee_initials=json.dumps(
                                card_seed.get("assignee_initials", []), separators=(",", ":")
                            ),
                            subtask_count=seed_int(card_seed.get("subtask_count", 0)),
                            attachment_count=seed_int(card_seed.get("attachment_count", 0)),
                            flagged=bool(card_seed.get("flagged", False)),
                            cover_variant=str(card_seed.get("cover_variant", "none")),
                            id=str(card_seed["id"]),
                        )
                    )


def parse_seed_date(value: object) -> date | None:
    if not isinstance(value, str):
        return None
    return date.fromisoformat(value)


def seed_int(value: object) -> int:
    return cast(int, value)
