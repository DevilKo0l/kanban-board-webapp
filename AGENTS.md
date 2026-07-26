# AGENTS.md

## Project Overview

This repository contains a local Project Management MVP with a Kanban board and an AI assistant.

Build the application from scratch. Use `docs/references/kanban-board-reference.png` as the primary visual direction, but create an original implementation with neutral branding. Match the layout, spacing, hierarchy, and interaction patterns rather than copying product names, logos, user photos, or proprietary assets.

Core requirements:

- A user can sign in.
- After signing in, the user sees one persistent Kanban board.
- The application uses a desktop-first project-management layout with a dark global header, a left workspace sidebar, a board toolbar, horizontally arranged status columns, and an optional AI chat drawer.
- The board has four fixed status columns: `To Do`, `In Progress`, `In Review`, and `Closed`.
- Fixed columns can be renamed but cannot be created, deleted, or reordered in the MVP.
- A column can be collapsed or expanded in the UI.
- Cards can be created, opened, edited, reordered, and moved with drag and drop.
- A card supports a title, optional description, optional due date, deterministic position, and lightweight display metadata needed to reproduce the reference-card appearance.
- Board search filters visible cards by title and description.
- An AI chat sidebar can create, edit, and move one or more cards.
- MVP authentication uses the hardcoded credentials `user` and `password`.
- The database must support multiple users for future development while enforcing one board per user for the MVP.
- The application runs locally in one Docker container.
- FastAPI serves the built Next.js application at `/`.
- Keep the MVP simple. Do not add features outside `PLAN.md` or the requested task.

UI colors:

- Global Header: `#202020`
- Page Background: `#ffffff`
- Border: `#e7e7eb`
- Primary Text: `#252525`
- Muted Text: `#77777f`
- Active Purple: `#6c5ce7`
- Active Purple Background: `#eeeafe`
- To Do Background: `#f6f6f7`
- In Progress Background: `#f0f1ff`
- In Review Background: `#fff9e7`
- Closed Background: `#edf8f3`
- Closed Green: `#14835b`
- Review Yellow: `#b87900`

### Current State

- Treat this as a greenfield implementation. Do not depend on a pre-existing frontend or backend.
- Inspect the repository before scaffolding so existing configuration or user-created files are preserved.
- Review `PLAN.md` before making changes.
- Store project planning and execution documents in `docs/`.
- Keep the primary UI reference at `docs/references/kanban-board-reference.png`.
- Treat the reference image as development documentation only. Do not import, copy, or serve it from the production frontend.

### UI and Interaction Requirements

- Review `docs/references/kanban-board-reference.png` before implementing or materially changing the application shell, board layout, columns, or task cards.
- Use the reference image to guide visual hierarchy, spacing, density, proportions, and interaction patterns. Do not copy its branding, logos, user photos, text content, or proprietary artwork.
- Build a responsive application shell inspired by the reference image:
  - A dark global header approximately 48-52 px high.
  - A fixed desktop sidebar approximately 240-270 px wide.
  - A main toolbar containing view tabs on the left and board controls on the right.
  - A board canvas with horizontal overflow when columns do not fit.
- The sidebar must include a workspace identity, basic navigation items, a `Spaces` section, and one selected space representing the MVP board.
- Sidebar destinations other than the selected board are visual navigation placeholders only. Mark unavailable actions clearly and do not build extra pages.
- The toolbar must show `List`, `Board`, and `Calendar` view tabs. Only `Board` is functional in the MVP; unavailable views must be visibly disabled or labelled as unavailable.
- The toolbar search control must be functional. Additional reference controls such as `Customize`, `New`, and app-grid icons may be present for visual fidelity but must not imply unsupported functionality.
- The `Board` tab must be visually active with a purple underline or equivalent active state.
- Use four status columns with subtle status-specific tinted backgrounds and white cards.
- Columns should have a readable fixed width on desktop, consistent gaps, rounded containers, and an `Add task` action at the bottom.
- `In Review` may start collapsed to resemble the reference. Collapsing is a presentation preference and does not change board data.
- Cards must use restrained borders and shadows, clear typography, and compact metadata rows.
- Use initials-based avatar circles and local decorative cover assets when needed. Do not depend on remote avatar or image services.
- Lightweight visual metadata may include assignee initials, subtask count, attachment count, flagged state, and a local cover variant. These do not require full subtask, upload, notification, or user-assignment systems.
- Clicking a card opens an editor dialog or side panel. The editor must support the required editable fields without navigating away from the board.
- Drag-and-drop must support moving cards within a column and between columns. Provide a keyboard-accessible alternative when supported by the chosen library.
- Opening the AI control displays a right-side drawer without destroying the user's current board context.
- On narrower screens, the sidebar may collapse and the board must remain horizontally scrollable. Do not compress columns until card content becomes unreadable.
- Use consistent loading, empty, error, hover, focus, disabled, and drag states.
- Accessibility basics are required: semantic controls, visible keyboard focus, labels for icon-only controls, reasonable contrast, and no color-only status communication.

## Tech Stack

- Frontend framework: Next.js App Router
- Frontend language: TypeScript
- Backend framework: FastAPI
- Backend language: Python
- Database: SQLite, created automatically when missing
- Database access: SQLAlchemy 2.x with explicit transactions
- AI provider: OpenRouter
- AI model: `openai/gpt-oss-120b`
- Python package manager: `uv`
- JavaScript package manager and workspace: `npm` using the root `package.json`
- Styling: Tailwind CSS with small reusable UI primitives; avoid a large component framework unless already present
- Icons: Lucide React or an equivalent lightweight icon set
- Drag and drop: `dnd-kit`
- State management: React state and server API state; do not add a global state library unless clearly required
- Testing: Use the frameworks configured during project scaffolding
- Build tooling: Next.js, `uv`, and Docker

## Folder Structure

This is the target project structure:

```text
project-root/
├── apps/
│   ├── frontend/
│   │   └── web/
│   │       ├── public/                 # Local images, icons, and cover assets
│   │       ├── src/
│   │       │   ├── app/                # Next.js routes, layouts, and providers
│   │       │   ├── features/           # auth, board, and ai-chat features
│   │       │   ├── components/         # Shared layout and UI components
│   │       │   ├── lib/                # API client, helpers, and utilities
│   │       │   └── styles/             # Global styles and design tokens
│   │       ├── tests/
│   │       ├── AGENTS.md
│   │       └── package.json
│   │
│   └── backend/
│       └── api/
│           ├── src/
│           │   ├── modules/             # auth, board, and AI domains
│           │   ├── config/              # Settings and environment loading
│           │   ├── database/            # Models, session, and initialization
│           │   ├── app.py               # FastAPI application construction
│           │   └── main.py              # Backend entry point
│           ├── tests/
│           ├── pyproject.toml
│           └── uv.lock
│
├── packages/
│   └── types/
│       ├── src/                          # Shared TypeScript contracts
│       └── package.json
├── scripts/                              # Cross-platform start and stop scripts
├── docs/
│   ├── references/
│   │   └── kanban-board-reference.png     # Development-only UI reference
│   ├── database-schema.json
│   └── database.md
├── .env                                  # Local only; never commit
├── .env.example
├── .gitignore
├── Dockerfile
├── AGENTS.md
├── PLAN.md
├── README.md
├── package.json                          # Root JavaScript workspace and scripts
└── package-lock.json
```

Rules:

- Place new files in the closest existing feature or domain directory.
- Store development-only design references under `docs/references/`; store only application runtime assets under `apps/frontend/web/public/`.
- Do not include files from `docs/references/` in the frontend build or Docker runtime image unless a specific requirement explicitly needs them.
- Follow the repository structure before introducing new directories.
- Do not reorganize unrelated files as part of a focused task.
- Keep frontend, backend, database, and AI responsibilities separated.
- `apps/frontend/web` owns browser UI, client-side interaction, and frontend tests.
- `apps/backend/api` owns authentication, API routes, database access, OpenRouter integration, and backend tests.
- `packages/types` contains reusable TypeScript contracts only; do not place runtime business logic there.
- Keep FastAPI/Pydantic schemas as the backend validation source of truth and keep frontend contracts aligned through focused integration tests.
- Do not import application code directly between `apps/frontend/web` and `apps/backend/api`; communicate through HTTP API contracts.
- Keep board domain logic separate from presentation components.
- Do not expose backend secrets or trusted logic to the frontend.

## Coding Standards

### General Rules

- Write simple, readable, and maintainable code.
- Avoid over-engineering and unnecessary defensive programming.
- Prefer clarity and consistency over cleverness.
- Use descriptive names instead of abbreviations.
- Keep functions, components, and modules focused on one responsibility.
- Keep changes small and relevant to the requested task.
- Do not add extra MVP features unless explicitly requested.
- Reuse existing patterns and libraries before introducing alternatives.
- Add a dependency only when the task clearly requires it.
- Use stable versions compatible with the project.
- Identify and prove the root cause before applying a fix. Do not guess.
- Validate API input and AI-generated actions before changing data.
- Do not ignore errors or fail silently.
- Keep database operations safe when moving or updating multiple cards.
- Keep card order deterministic and persistent.
- Read `OPENROUTER_API_KEY` from the root `.env` file.
- Never send the OpenRouter API key to the frontend.
- Use structured and validated AI actions for card operations.
- Remove dead code, unused imports, debug statements, and obsolete comments.
- Comments should explain why, not repeat what the code does.
- Update tests and documentation when behavior changes.
- Keep `README.md` minimal and practical.
- Do not use emojis in code, logs, documentation, or product copy.

### Frontend and UI Rules

- Create reusable components for the application shell, sidebar, toolbar, board, column, card, dialogs, and AI drawer.
- Do not put the complete board implementation in one large component.
- Use design tokens or shared constants for spacing, borders, radii, typography, and status colors.
- Preserve a compact information density similar to the reference image.
- Do not make the interface look like a generic dashboard made from unrelated cards.
- Do not use large gradients, glassmorphism, excessive animation, or oversized rounded elements.
- Use animation only for useful transitions such as drawer opening, column collapse, and drag feedback.
- Keep unavailable reference controls explicitly disabled rather than implementing undocumented features.
- Store only presentation preferences such as collapsed columns in local storage when useful. Persist board data through the backend.
- Use optimistic updates only when rollback behavior is clear and tested.

## Safe Change Rules

- Never expose, log, commit, or hard-code secrets.
- Never commit `.env`.
- Do not run destructive commands unless explicitly required.
- Do not delete or reset user data unless explicitly requested.
- Do not add, remove, or upgrade dependencies unless required by the task.
- Do not modify lockfiles unless dependency changes require it.
- Do not edit generated files when their source can be updated instead.
- Do not make major architectural changes unless required by the task.
- Preserve API behavior and stored data unless a breaking change is explicitly requested.
- Do not expand authentication or permissions beyond the MVP without a requirement.
- Do not implement registration, multiple boards, custom statuses, real inboxes, calendars, notifications, file uploads, or team management.
- Clearly report database schema, API contract, configuration, visual-scope, or Docker impacts.

## Testing and Validation

- Required tests: Add or update focused tests for changed frontend, backend, database, and AI behavior.
- Minimum validation: Run the smallest relevant format, lint, type-check, test, and build commands.
- Manual checks: Verify only the workflows affected by the change.
- Visual validation: Compare the running application against the reference layout at a desktop viewport and verify the major regions, spacing, column treatment, card density, and active states.

When relevant, verify:

- Sign-in success and failure.
- Application-shell layout and responsive behavior.
- Board loading for the signed-in user.
- Search filtering and visible-card count.
- Column renaming, collapsing, and persistence rules.
- Card creation, opening, editing, moving, ordering, and persistence.
- Drag-and-drop within and across columns.
- AI drawer open and close behavior.
- AI single-card and multi-card operations.
- SQLite database creation when missing.
- Docker image build and container startup.
- FastAPI serving the built frontend at `/`.

If a command cannot be run, explain why and state what remains unverified. Do not claim success unless the command actually passed.

## Commands

- JavaScript dependencies: Run the install command defined by the root `package.json` and root lockfile.
- Python dependencies: Run `uv sync` from `apps/backend/api/`.
- Docker build: `docker build .`
- Development: Use the platform-specific start script under `scripts/`.
- Stop: Use the matching platform-specific stop script under `scripts/`.
- Frontend format, lint, type-check, test, and build: Use the exact scripts defined in `apps/frontend/web/package.json`.
- Shared types validation and build: Use the exact scripts defined in `packages/types/package.json`.
- Backend format, lint, type-check, and test: Use the exact commands defined in `apps/backend/api/pyproject.toml`.

Do not invent command names. Inspect the repository configuration before running them.

## Working Process

Before making changes:

1. Read this file and any more specific nested `AGENTS.md` files.
2. Read `PLAN.md`.
3. Inspect the relevant implementation, tests, configuration, documentation, and `docs/references/kanban-board-reference.png` when the task affects the UI.
4. Follow existing repository patterns before introducing new ones.
5. Identify the smallest set of files required for the task.
6. Confirm the root cause of defects with evidence.
7. Do not make unrelated improvements.

## Response Instructions

When completing a task, summarize:

- What changed
- Important implementation and visual decisions
- Files changed
- Validation performed
- Commands that could not be run
- Compatibility impacts
- Remaining risks or follow-up work

Do not claim that a command passed unless it was run successfully. Keep the response concise unless detailed explanation is requested.
