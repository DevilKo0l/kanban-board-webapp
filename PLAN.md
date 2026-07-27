# PLAN.md

## Project Goal

Build a local Project Management MVP from scratch with:

- Hardcoded sign-in using `user` and `password`.
- One persistent Kanban board for the signed-in user.
- A desktop-first project-management interface inspired by `docs/references/kanban-board-reference.png`.
- A dark global header, left workspace sidebar, board view toolbar, horizontally arranged status columns, compact task cards, and a right-side AI drawer.
- Four fixed status columns: `To Do`, `In Progress`, `In Review`, and `Closed`.
- Fixed columns that can be renamed and collapsed but cannot be added, removed, or reordered.
- Cards that can be created, opened, edited, reordered, and moved with drag and drop.
- Functional board search by card title and description.
- Lightweight card metadata for visual fidelity without implementing full subtasks, attachments, uploads, or team management.
- An AI chat sidebar that can create, edit, and move one or more cards.
- A Next.js frontend and FastAPI backend running in one Docker container.
- SQLite storage created automatically when missing.

Match `docs/references/kanban-board-reference.png` in visual hierarchy and interaction style without copying its branding, logos, user photos, text content, or proprietary artwork. Keep the implementation simple and limited to this MVP.

## Delivery Rules

- Complete the phases in order unless a dependency requires otherwise.
- Keep each phase small, testable, and usable before moving forward.
- Follow the root `AGENTS.md` and any more specific nested `AGENTS.md` files.
- Treat the project as a greenfield implementation, but inspect and preserve any files already present in the repository.
- Establish reusable design tokens and component boundaries before building detailed screens.
- Use `docs/references/kanban-board-reference.png` for layout direction, not as permission to copy product names, logos, user photos, text content, or proprietary assets.
- Keep the reference image under `docs/references/` as development documentation and exclude it from the production frontend bundle.
- Keep non-MVP controls visibly disabled or labelled unavailable; do not silently create extra features.
- Update tests and documentation when behavior changes.
- Aim for 80% test coverage only when that produces useful coverage for meaningful behavior.
- Do not add low-value tests only to reach a coverage number; missing 80% is acceptable when the remaining gaps are not worth the maintenance cost.
- Do not add registration, multiple boards, custom statuses, functional list/calendar views, real inboxes, notifications, file uploads, roles, or team administration.

## Phase 1: Repository Review and Planning

### Tasks

- [x] Inspect the repository and confirm which files and configuration already exist.
- [x] Confirm `docs/references/kanban-board-reference.png` exists and is readable before UI implementation begins.
- [x] Review `docs/references/kanban-board-reference.png` and document the required visual regions: global header, workspace sidebar, view toolbar, board canvas, status columns, task cards, and AI drawer.
- [x] Confirm the frontend uses Next.js App Router, TypeScript, Tailwind CSS, Lucide icons, and `dnd-kit` unless an equivalent setup is already present and approved.
- [x] Record the exact development, test, lint, type-check, and build commands after scaffolding decisions are finalized.
- [x] Create `apps/frontend/web/AGENTS.md` describing only frontend-specific structure, component boundaries, design tokens, accessibility rules, and visual conventions.
- [x] Confirm the monorepo structure and responsibilities of `apps/frontend/web`, `apps/backend/api`, `packages/types`, `scripts`, `docs`, root workspace files, and Docker files.
- [x] Define which reference controls are functional and which are intentionally unavailable in the MVP.
- [x] Review and approve this plan before implementation begins.

### Validation

- The documented technical decisions are internally consistent.
- The visual scope is specific enough that an agent does not need to invent the main layout.
- Functional and visual-only controls are clearly separated.
- `apps/frontend/web/AGENTS.md` does not contradict the root `AGENTS.md`.
- No application implementation work is included in this phase.

### Complete When

- The greenfield repository approach, visual target, technical choices, commands, and implementation plan are understood and approved.

## Phase 2: Backend and Docker Scaffolding

### Tasks

- [x] Create the monorepo directories exactly as defined in `AGENTS.md` without adding parallel `frontend/` or `backend/` roots.
- [x] Create the root `package.json` as an npm workspace for `apps/frontend/web` and `packages/*`.
- [x] Create `packages/types` for shared TypeScript API and board contracts without runtime business logic.
- [x] Create the FastAPI backend under `apps/backend/api/`.
- [x] Configure Python dependencies with `uv` inside `apps/backend/api/`.
- [x] Add a health endpoint and a simple API response.
- [x] Configure FastAPI to serve a temporary static page at `/`.
- [x] Create one Docker image capable of containing the backend and built frontend files.
- [x] Add start and stop scripts for Windows, macOS, and Linux under `scripts/`.
- [x] Add safe environment-variable loading, a committed `.env.example`, and rules preventing `.env` from being committed.

### Validation

- The repository contains one root JavaScript workspace, one frontend app, one FastAPI app, and one shared TypeScript package in the approved paths.
- No duplicate root-level `frontend/` or `backend/` application directories exist.
- Build the Docker image successfully.
- Start and stop the application with the platform scripts.
- Confirm `/` serves the temporary page.
- Confirm the health and example API endpoints return successful responses.
- Confirm secrets are not present in the image, logs, or committed configuration.

### Complete When

- The container starts locally and serves both static content and a working API foundation.

## Phase 3: Build the Application Shell and Kanban UI

### Tasks

- [x] Scaffold the Next.js App Router frontend in `apps/frontend/web/` using TypeScript.
- [x] Organize frontend code under `src/app`, `src/features`, `src/components`, `src/lib`, and `src/styles` according to `AGENTS.md`.
- [x] Configure Tailwind CSS, shared design tokens, icons, formatting, linting, type-checking, and frontend tests.
- [x] Consume reusable frontend-facing contracts from `packages/types` instead of duplicating TypeScript interfaces across features.
- [x] Build the dark global header with navigation affordances, centered search styling, AI trigger, and compact right-side actions.
- [x] Build the desktop workspace sidebar with workspace identity, basic navigation placeholders, a `Spaces` section, and one visually selected board space.
- [x] Build the board toolbar with `List`, `Board`, and `Calendar` tabs, with only `Board` active and functional.
- [x] Add a functional board search control and a visible-card count.
- [x] Build four status columns with the required labels, status colors, compact headers, card counts, and `Add task` actions.
- [x] Make `In Review` collapsible and allow every column to collapse or expand without changing board data.
- [x] Build reusable task cards with a title and optional compact metadata such as initials avatars, due date, subtask count, attachment count, flag, and local cover variant.
- [x] Add seeded local demo data that creates a balanced board visually similar to `docs/references/kanban-board-reference.png` without copying its exact names, photos, or artwork.
- [x] Add a card creation flow and an edit dialog or side panel for title, description, and due date.
- [x] Add client-side card movement and deterministic reordering with `dnd-kit` using temporary local state.
- [x] Add loading, empty, error, hover, focus, disabled, dragging, and drop-target states.
- [x] Ensure the board scrolls horizontally when needed and the sidebar collapses appropriately on narrower screens.
- [x] Add focused frontend tests for shell rendering, search, column collapse, card editing, and drag-and-drop domain behavior.

### Validation

- The major layout regions visually resemble `docs/references/kanban-board-reference.png` at a desktop viewport without copying its branding or proprietary content.
- The active board tab, selected space, column status treatments, card density, and spacing are clear and consistent.
- Unavailable controls do not navigate or suggest completed features.
- Search filters cards by title and description and updates the visible count.
- Cards can be created, edited, reordered, and moved using local state.
- Column collapse does not lose or mutate card data.
- Keyboard focus is visible and icon-only buttons have accessible names.
- The frontend production build succeeds.

### Complete When

- A polished, responsive, frontend-only Kanban board reproduces the reference layout and required interactions with local demo data.

## Phase 4: MVP Authentication

### Tasks

- [ ] Add a sign-in screen shown before the application shell.
- [ ] Accept only the credentials `user` and `password`.
- [ ] Create a backend-managed session using a secure, HttpOnly cookie suitable for local development.
- [ ] Add logout behavior in the application shell.
- [ ] Prevent unauthenticated access to the board UI and board APIs.
- [ ] Keep the authentication implementation replaceable without building production authentication.
- [ ] Preserve the visual style of the main application on the sign-in screen without reproducing the full board before authentication.

### Validation

- Correct credentials open the board.
- Incorrect credentials show a clear error.
- Logout returns the user to sign-in.
- Protected UI and API access fail when signed out.
- Authentication secrets or session details are not exposed to frontend JavaScript unnecessarily.

### Complete When

- The user must sign in before accessing the Kanban board and can log out successfully.

## Phase 5: Database Design

### Tasks

- [ ] Design the minimal SQLite schema for users, boards, columns, and cards.
- [ ] Support multiple users in the schema while enforcing one board per user for the MVP.
- [ ] Include four fixed status keys and deterministic ordering for columns and cards.
- [ ] Allow fixed column display names to change while preventing creation, deletion, and reordering.
- [ ] Define card fields for title, optional description, optional due date, position, and timestamps.
- [ ] Define only the lightweight optional display fields needed by the reference-inspired UI, such as assignee initials, subtask count, attachment count, flagged state, and local cover variant.
- [ ] Do not design full subtask, attachment, file upload, notification, or team-membership systems.
- [ ] Save the proposed schema as `docs/database-schema.json`.
- [ ] Document initialization, relationships, constraints, ordering strategy, fixed-column rules, and key decisions in `docs/database.md`.
- [ ] Review and approve the schema before implementing it.

### Validation

- The schema supports every required board and card operation.
- User data is separated correctly.
- Fixed status identity is separate from editable column labels.
- Ordering and ownership constraints are explicit.
- Lightweight display fields do not introduce hidden feature systems.
- No unnecessary tables or fields are included.

### Complete When

- The database design is documented and approved.

## Phase 6: Persistent Backend API

### Tasks

- [ ] Organize backend code under `src/modules`, `src/config`, and `src/database`, keeping `app.py` and `main.py` focused on application construction and startup.
- [ ] Initialize the SQLite database automatically when it does not exist.
- [ ] Create the MVP user, one board, four fixed columns, and reference-inspired demo cards when required.
- [ ] Add an API operation to load the signed-in user's complete board.
- [ ] Add API operations to rename columns.
- [ ] Add API operations to create, read, and edit cards.
- [ ] Add API operations to move and reorder cards within and across columns.
- [ ] Validate ownership, fixed status identifiers, input, optional display metadata, and card ordering.
- [ ] Keep multi-step database changes transactional.
- [ ] Prevent APIs from creating, deleting, or reordering fixed columns.
- [ ] Add focused backend tests for successful, invalid, unauthorized, and rollback behavior.

### Validation

- A new database is created and initialized correctly.
- Board data is isolated by user.
- Column names and card changes persist after restart.
- Invalid or unauthorized operations do not change data.
- Card ordering remains deterministic after repeated moves.
- Fixed columns retain their stable status keys even after renaming.

### Complete When

- The backend fully supports the required persistent Kanban behavior and reference-inspired card data.

## Phase 7: Connect the Frontend to the Backend

### Tasks

- [ ] Replace frontend demo state with board data loaded from the backend API.
- [ ] Keep backend Pydantic request and response schemas aligned with the TypeScript contracts exposed from `packages/types`.
- [ ] Add a focused integration test that detects incompatible API contract changes.
- [ ] Connect column renaming to the API.
- [ ] Connect card creation, opening, and editing to the API.
- [ ] Persist drag-and-drop moves and reordering through the API.
- [ ] Keep column collapse as a presentation preference rather than board-domain data.
- [ ] Keep board search client-side unless a clear performance requirement justifies server search.
- [ ] Add clear loading, empty, retry, and error states that preserve the reference-inspired layout.
- [ ] Roll back failed optimistic interactions or refresh canonical board state safely.
- [ ] Remove obsolete mock state while keeping intentional seed initialization in the backend.
- [ ] Add focused frontend and integration tests.

### Validation

- Reloading the page preserves all board changes.
- Restarting the container preserves all board changes.
- Failed API requests do not leave the UI in an incorrect state.
- Search, column collapse, card editing, and drag and drop work with backend-loaded data.
- Sign-in, board loading, and logout work together.
- The connected interface retains the approved layout and information density.

### Complete When

- The frontend operates as a persistent, reference-inspired Kanban board backed by FastAPI and SQLite.

## Phase 8: OpenRouter Connectivity

### Tasks

- [ ] Add a backend-only OpenRouter client.
- [ ] Read `OPENROUTER_API_KEY` from the root environment configuration.
- [ ] Use the model `openai/gpt-oss-120b`.
- [ ] Add a minimal AI request that can verify connectivity.
- [ ] Handle missing configuration, provider errors, timeouts, malformed responses, and invalid responses clearly.
- [ ] Mock OpenRouter in automated tests and keep live connectivity testing optional.

### Validation

- A live test returns the expected answer to a simple request when a valid key is available.
- Automated tests do not depend on external network access.
- The API key never appears in frontend code, logs, or responses.
- Provider failures return a safe, useful error without changing board data.

### Complete When

- The backend can call OpenRouter safely and reliably.

## Phase 9: Structured AI Card Actions

### Tasks

- [ ] Send the current board JSON, the user's message, and only the relevant conversation history to the model.
- [ ] Define a structured response containing an assistant message and optional card actions.
- [ ] Support only the required AI actions: create, edit, and move cards.
- [ ] Allow supported edits only for approved card fields such as title, description, and due date.
- [ ] Resolve columns by stable status key or validated identifier rather than editable display name alone.
- [ ] Validate every AI action before applying it.
- [ ] Apply multi-card updates in one database transaction to avoid partial changes.
- [ ] Return the assistant response and the updated canonical board state.
- [ ] Reject requests to create columns, delete columns, add boards, or perform unsupported reference controls.
- [ ] Add tests for valid, invalid, empty, single-card, multi-card, ambiguous-card, and rollback responses.

### Validation

- Normal chat can return a response without changing the board.
- Valid actions update the correct cards and persist.
- AI-created cards appear in the requested valid column with deterministic ordering.
- Invalid identifiers, ambiguous targets, unsupported fields, or unsupported actions do not change the board.
- A failed multi-card operation leaves the board unchanged.
- Renamed column labels do not break AI movement because stable status identities are preserved.

### Complete When

- AI responses can safely perform all required card operations through validated backend logic.

## Phase 10: AI Chat Sidebar and Final Integration

### Tasks

- [ ] Implement the AI control in the global header and open a right-side chat drawer.
- [ ] Keep the board visible and preserve its scroll position and current search while the drawer is open.
- [ ] Support sending messages and displaying the current in-session conversation.
- [ ] Show clear empty, loading, success, and error states.
- [ ] Prevent duplicate submissions while a request is running.
- [ ] Refresh or reconcile the board automatically when AI actions change it.
- [ ] Make AI-created or edited cards visually discoverable without using distracting animation.
- [ ] Verify the drawer works at desktop and narrower supported viewport sizes.
- [ ] Add focused UI, integration, and end-to-end tests for the complete workflow.
- [ ] Compare the finished interface with `docs/references/kanban-board-reference.png` at the target desktop viewport, checking layout hierarchy, spacing, card density, status treatment, and active states.
- [ ] Update the minimal README with exact local setup, environment, build, and run commands.

### Validation

- The user can open and close the AI drawer without losing board context.
- The user can chat without changing the board.
- The AI can create, edit, and move one or more cards.
- AI board changes appear without a manual page refresh.
- Board data remains correct after reload and container restart.
- The app remains usable with the sidebar collapsed and the AI drawer open at supported widths.
- Non-MVP controls remain clearly unavailable.
- The complete Docker build and main MVP workflows pass.

### Complete When

- The entire reference-inspired MVP works locally in one Docker container and satisfies the project requirements in `AGENTS.md`.

## Final Acceptance Criteria

- [ ] Hardcoded sign-in and logout work securely for the local MVP.
- [ ] The database supports multiple users with one persistent board per user.
- [ ] The application has the approved dark header, workspace sidebar, board toolbar, horizontal board canvas, status columns, compact cards, and AI drawer.
- [ ] The board provides four stable fixed statuses: `To Do`, `In Progress`, `In Review`, and `Closed`.
- [ ] Fixed columns can be renamed and collapsed but cannot be added, deleted, or reordered.
- [ ] Board search filters card titles and descriptions and reports the visible count.
- [ ] Cards can be created, opened, edited, reordered, and moved.
- [ ] Drag-and-drop works within and across columns and preserves deterministic ordering.
- [ ] Lightweight card metadata and local cover assets reproduce the reference-inspired card appearance without adding unsupported systems.
- [ ] AI chat can create, edit, and move one or more cards safely.
- [ ] SQLite initializes automatically and persists data.
- [ ] FastAPI serves the built Next.js frontend at `/`.
- [ ] The application builds and runs in one Docker container.
- [ ] The repository follows the approved monorepo layout with `apps/frontend/web`, `apps/backend/api`, and `packages/types`, without duplicate application roots.
- [ ] The UI reference exists at `docs/references/kanban-board-reference.png` and is not shipped as a production frontend asset.
- [ ] Root workspace scripts and platform scripts operate on the correct leaf applications.
- [ ] The interface is responsive, horizontally scrollable where required, and keyboard accessible for core controls.
- [ ] Unavailable reference controls are disabled or clearly labelled and do not imply completed features.
- [ ] Required tests and validation commands pass.
- [ ] Secrets are not exposed or committed.
- [ ] Documentation contains only the commands and decisions needed to run and maintain the MVP.
