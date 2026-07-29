from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    username: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(Text, unique=True)
    display_name: Mapped[str | None] = mapped_column(Text)
    company: Mapped[str | None] = mapped_column(Text)
    role_title: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    boards: Mapped[list["Board"]] = relationship(back_populates="user", cascade="all, delete")

    __table_args__ = (
        CheckConstraint("length(trim(username)) > 0", name="ck_users_username_not_blank"),
        CheckConstraint("email is null or length(email) <= 254", name="ck_users_email_max_length"),
        CheckConstraint(
            "display_name is null or length(display_name) <= 120",
            name="ck_users_display_name_max_length",
        ),
        CheckConstraint(
            "company is null or length(company) <= 120",
            name="ck_users_company_max_length",
        ),
        CheckConstraint(
            "role_title is null or length(role_title) <= 120",
            name="ck_users_role_title_max_length",
        ),
    )


class Board(Base):
    __tablename__ = "boards"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(back_populates="boards")
    columns: Mapped[list["BoardColumn"]] = relationship(
        back_populates="board", cascade="all, delete", order_by="BoardColumn.position"
    )
    cards: Mapped[list["Card"]] = relationship(
        back_populates="board", cascade="all, delete", order_by="Card.position"
    )

    __table_args__ = (
        CheckConstraint("length(trim(name)) > 0", name="ck_boards_name_not_blank"),
        UniqueConstraint("user_id", name="ux_boards_user_id"),
    )


class BoardColumn(Base):
    __tablename__ = "board_columns"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    board_id: Mapped[str] = mapped_column(
        ForeignKey("boards.id", ondelete="CASCADE"), nullable=False
    )
    status_key: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    board: Mapped[Board] = relationship(back_populates="columns")
    cards: Mapped[list["Card"]] = relationship(
        back_populates="column", order_by="Card.position", overlaps="board,cards"
    )

    __table_args__ = (
        CheckConstraint(
            "status_key in ('todo', 'in_progress', 'in_review', 'closed')",
            name="ck_board_columns_status_key",
        ),
        CheckConstraint("length(trim(name)) > 0", name="ck_board_columns_name_not_blank"),
        CheckConstraint("position > 0", name="ck_board_columns_position_positive"),
        UniqueConstraint("id", "board_id", name="uq_board_columns_id_board_id"),
        UniqueConstraint("board_id", "status_key", name="uq_board_columns_board_status"),
        UniqueConstraint("board_id", "position", name="uq_board_columns_board_position"),
    )


class Card(Base):
    __tablename__ = "cards"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    board_id: Mapped[str] = mapped_column(ForeignKey("boards.id", ondelete="CASCADE"))
    column_id: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    due_date: Mapped[date | None] = mapped_column(Date)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    assignee_initials: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    subtask_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    attachment_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cover_variant: Mapped[str] = mapped_column(Text, default="none", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    board: Mapped[Board] = relationship(back_populates="cards", overlaps="cards")
    column: Mapped[BoardColumn] = relationship(back_populates="cards", overlaps="board,cards")

    __table_args__ = (
        ForeignKeyConstraint(
            ["column_id", "board_id"],
            ["board_columns.id", "board_columns.board_id"],
            name="fk_cards_column_same_board",
            ondelete="RESTRICT",
        ),
        CheckConstraint("length(trim(title)) > 0", name="ck_cards_title_not_blank"),
        CheckConstraint("length(title) <= 120", name="ck_cards_title_max_length"),
        CheckConstraint(
            "description is null or length(description) <= 600",
            name="ck_cards_description_max_length",
        ),
        CheckConstraint("position > 0", name="ck_cards_position_positive"),
        CheckConstraint("subtask_count >= 0", name="ck_cards_subtask_count_non_negative"),
        CheckConstraint(
            "attachment_count >= 0",
            name="ck_cards_attachment_count_non_negative",
        ),
        CheckConstraint(
            "cover_variant in ('none', 'soft-gradient', 'shadow', 'waves')",
            name="ck_cards_cover_variant",
        ),
        UniqueConstraint("column_id", "position", name="uq_cards_column_position"),
    )
