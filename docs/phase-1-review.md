# Phase 1 Review

## Repository Inventory

- Root files present: `AGENTS.md`, `PLAN.md`.
- Tracked development reference: `docs/references/kanban-board-reference.png`.
- Empty target directories already present: `apps/frontend/web`, `apps/backend/api`, `packages/types`, `scripts`.
- Nested `AGENTS.md` files found before this phase: none.
- Git status before edits: clean.

This confirms the repository is a greenfield implementation with planning files and the UI reference in place.

## Visual Reference Review

Reference file:

- Path: `docs/references/kanban-board-reference.png`
- Size: 369216 bytes
- Readable: yes

Required visual regions observed:

- A dark global header with browser-like navigation affordances, centered search, AI action, create action, app grid, and account affordance.
- A left workspace sidebar around one quarter of the initial viewport width, with workspace identity, navigation placeholders, a `Spaces` section, colored initials, and one selected space.
- A board toolbar below the header with `List`, active `Board`, disabled or unavailable `Calendar`, add-style controls, search, show/count control, and customize affordance.
- A wide board canvas with horizontal spacing between status columns.
- Status columns using subtle tinted backgrounds, compact headers, readable counts, and bottom `Add task` actions.
- A collapsed `In Review` column represented as a narrow vertical strip.
- Compact white task cards with light borders, slight shadows, title hierarchy, metadata rows, initials avatars, due dates, subtask counts, flags, attachment indicators, and occasional local cover imagery.
- A right-side AI drawer is required by the product plan, although it is not visible in the reference image.

Implementation must reproduce the layout hierarchy, spacing, card density, and interaction patterns with neutral branding and original content. The reference image must remain development documentation and must not be served as a runtime frontend asset.

## Approved Technical Direction

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, Lucide React or equivalent lightweight icons, `dnd-kit`, React/server API state.
- Backend: FastAPI, Python, SQLAlchemy 2.x, SQLite, `uv`.
- AI: OpenRouter from the backend only, model `openai/gpt-oss-120b`.
- JavaScript workspace: npm from the root `package.json`.
- Shared contracts: `packages/types` for TypeScript API and board contracts only.
- Runtime: one Docker container; FastAPI serves the built static frontend at `/`.

No existing implementation or manifests conflict with these decisions.

## Monorepo Responsibilities

- `apps/frontend/web`: browser UI, frontend tests, static build output, and runtime-safe local assets.
- `apps/backend/api`: FastAPI application, authentication, database access, board APIs, OpenRouter integration, and backend tests.
- `packages/types`: shared TypeScript contracts only, with no runtime business logic.
- `scripts`: cross-platform start and stop wrappers for Docker Compose.
- `docs`: planning, design references, database design, and execution notes.
- Root workspace files: npm workspace configuration, Docker, environment example, gitignore, README, and project-wide instructions.

## Functional Versus Unavailable Controls

Functional in the MVP:

- Sign in and sign out.
- Board tab.
- Board search by title and description.
- Fixed column rename.
- Column collapse and expand as presentation state.
- Card create, open, edit, reorder, and move.
- AI drawer chat that can create, edit, and move cards through backend validation.

Intentionally unavailable visual placeholders:

- List and Calendar views.
- Extra spaces and navigation destinations.
- Inbox, Home, More, Add Space, Customize, app grid, and similar non-MVP reference controls.
- Registration, multiple boards, custom statuses, uploads, notifications, team administration, and file attachments as real systems.

Unavailable controls must be visibly disabled, labelled unavailable, or otherwise clearly non-functional.

## Command Plan

Exact runnable script definitions are not available yet because root `package.json`, frontend `package.json`, backend `pyproject.toml`, lockfiles, Dockerfile, and platform scripts are created in later phases. Do not claim these commands pass until the corresponding files exist and the commands are run.

Approved command owners for later phases:

- JavaScript install: root npm workspace command defined by root `package.json` and `package-lock.json`.
- Frontend format, lint, type-check, test, and build: scripts defined in `apps/frontend/web/package.json`.
- Shared types validation and build: scripts defined in `packages/types/package.json`.
- Python dependencies: `uv sync` from `apps/backend/api`.
- Backend format, lint, type-check, and test: commands defined in `apps/backend/api/pyproject.toml`.
- Docker build: `docker build .`.
- Development start and stop: platform scripts under `scripts`.

The exact script names and commands must be recorded when the relevant manifests are created during Phase 2 and Phase 3.

## Phase 1 Approval

The user approved moving into implementation on July 26, 2026. Phase 1 itself contains planning, inspection, and repository guidance only; no application implementation is included.
