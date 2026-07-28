# Database Design

Phase 5 defines the SQLite schema for the persistent MVP board. This is a design checkpoint only; SQLAlchemy models, migrations, initialization code, and API handlers belong to Phase 6.

## Goals

The schema supports multiple users for future development while enforcing one board per user for the MVP. Each board has four fixed status columns: `todo`, `in_progress`, `in_review`, and `closed`. The user may rename fixed columns, but the MVP must not create, delete, or reorder columns.

Cards persist the fields required by the current board UI: title, optional description, optional due date, deterministic position, timestamps, and lightweight display metadata. The schema intentionally stores display counts and initials only; it does not introduce full subtasks, uploads, notifications, or team membership.

## Tables

`users` stores ownership identity and basic personal profile metadata. It has `id`, unique `username`, optional `email`, optional `display_name`, optional `company`, optional `role_title`, `created_at`, and `updated_at`. The MVP seed user is `user`, and profile fields may be null. Password storage is intentionally absent because Phase 4 authentication is hardcoded and production auth is out of scope.

The optional profile fields are scalar metadata only. `company` is a user-facing label, not a company account, workspace, billing entity, team, or permissions boundary. `email` is not used for login, invitations, notifications, or password recovery in the MVP.

`boards` stores one board per user. It has `id`, `user_id`, `name`, `created_at`, and `updated_at`. A unique index on `boards.user_id` enforces the MVP rule that each user has one board.

`board_columns` stores fixed status columns for a board. It has `id`, `board_id`, stable `status_key`, editable `name`, fixed `position`, `created_at`, and `updated_at`. `status_key` is constrained to the four MVP statuses. Unique constraints on `(board_id, status_key)` and `(board_id, position)` prevent duplicate statuses and ambiguous ordering.

`cards` stores board cards. It has `id`, `board_id`, `column_id`, `title`, optional `description`, optional `due_date`, `position`, `assignee_initials`, `subtask_count`, `attachment_count`, `flagged`, `cover_variant`, `created_at`, and `updated_at`. A composite foreign key from `(column_id, board_id)` to `board_columns(id, board_id)` prevents a card from referencing a column on another board.

The exact machine-readable proposal is in `docs/database-schema.json`.

## Relationships

`users` owns `boards` through `boards.user_id`.

`boards` owns `board_columns` through `board_columns.board_id`.

`boards` owns `cards` through `cards.board_id`.

`board_columns` contains `cards` through `cards.column_id`, with the composite board check described above.

The ownership path for loading a board is:

`users.id -> boards.user_id -> board_columns.board_id -> cards.board_id`

## Future Spaces

The current `Spaces` sidebar is visual navigation only, so this MVP schema does not include a `spaces` table. Adding one now would force unresolved decisions about space ownership, board grouping, permissions, icons, ordering, archival behavior, and shared membership.

The intended migration path is to insert `spaces` between `users` and `boards` when that feature is approved:

`users -> spaces -> boards -> board_columns -> cards`

If spaces later become shared between people or companies, the schema should introduce a separate workspace or membership design at that time rather than overloading the MVP `company` profile field.

## Fixed Column Rules

Column identity is `status_key`, not `name`. This lets users rename `To Do` or `Closed` without breaking API actions, AI actions, or stored cards.

The default fixed columns are:

| Status key | Default name | Position |
| --- | --- | --- |
| `todo` | To Do | 1000 |
| `in_progress` | In Progress | 2000 |
| `in_review` | In Review | 3000 |
| `closed` | Closed | 4000 |

SQLite constraints prevent unknown status keys and duplicate status keys per board. Application services must also prevent column creation, deletion, and reordering because SQLite cannot express the full "exactly these four rows per board" invariant with simple portable constraints.

## Ordering Strategy

Column order is fixed by `board_columns.position`. The MVP uses 1000, 2000, 3000, and 4000 and does not expose column reorder operations.

Card order is stored in `cards.position`, unique within each column. New cards receive the next available integer position, normally spaced by 1000. Moving or reordering cards must happen inside one explicit transaction:

1. Validate the signed-in user owns the board.
2. Validate the source card and destination column belong to that board.
3. Compute deterministic positions for affected cards.
4. Update all changed rows.
5. Commit once.

When no integer gap is available between adjacent cards, the service should renormalize positions in that column back to 1000-step spacing in the same transaction.

Reads sort by ascending `position`, then ascending `created_at`, then ascending `id` as a stable tie-breaker.

## Card Fields

Required card fields:

- `title`: required, trimmed non-empty, maximum 120 characters.
- `column_id`: required and must point to a fixed column on the same board.
- `position`: required deterministic integer order.

Optional card fields:

- `description`: nullable text, maximum 600 characters.
- `due_date`: nullable date stored as `YYYY-MM-DD`.

Lightweight display metadata:

- `assignee_initials`: JSON text array of short initials for card display only.
- `subtask_count`: non-negative integer count only.
- `attachment_count`: non-negative integer count only.
- `flagged`: boolean display flag.
- `cover_variant`: one of `none`, `soft-gradient`, `shadow`, or `waves`.

These metadata fields deliberately avoid new systems. There are no subtask rows, attachment rows, files, comments, notifications, users-to-cards assignments, or team membership tables in the MVP schema.

## Initialization

When the SQLite database file is missing, Phase 6 should create all tables and seed the local MVP data.

Initialization should be idempotent:

1. Create the MVP user with username `user` if missing.
2. Leave optional user profile fields null unless seed profile values are explicitly provided.
3. Create exactly one board for that user if missing.
4. Create missing fixed columns for that board.
5. Insert demo cards only if the board has no cards.

If a future startup finds a board missing one of the four fixed columns, it should repair the missing fixed column. If it finds extra status keys, duplicated fixed statuses, or invalid column ownership, it should fail clearly rather than silently changing user data.

## Key Decisions

The schema uses four tables only because that is enough for the MVP and keeps later implementation straightforward.

Basic personal information belongs on `users` as nullable scalar metadata. This supports future profile display without introducing profile, company, or workspace systems early.

The one-board-per-user rule is enforced by a unique index on `boards.user_id`, not by assuming only one user exists.

Fixed column identity is separated from editable display labels through `status_key` and `name`.

Card ownership is stored redundantly through `cards.board_id` and checked against `board_columns(id, board_id)` to make user-ownership validation and board loading simple and safe.

No authentication secret, OpenRouter key, or trusted backend logic is represented in the database schema.
