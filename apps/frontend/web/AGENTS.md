# Frontend AGENTS.md

## Scope

These instructions apply to `apps/frontend/web`, the browser UI for the Project Management MVP.

Follow the root `AGENTS.md` first. This file adds frontend-specific structure, component, styling, and accessibility guidance without weakening repository-wide rules.

## Current State

- Frontend implementation status: Greenfield.
- Required framework: Next.js App Router with TypeScript.
- Required styling approach: Tailwind CSS with shared design tokens and small reusable primitives.
- Required icon approach: Lucide React or an equivalent lightweight icon set.
- Required drag-and-drop approach: `dnd-kit`.
- Package manager: npm through the root workspace.
- Production serving model: static frontend build served by FastAPI from `/`.

## Directory Responsibilities

Use this structure when frontend implementation begins:

```text
apps/frontend/web/
|-- public/              # Runtime-safe local assets only
|-- src/
|   |-- app/             # Next.js App Router routes, layouts, providers
|   |-- components/      # Shared application shell and UI primitives
|   |-- features/        # Auth, board, and AI chat feature modules
|   |-- lib/             # API client, utilities, and frontend helpers
|   `-- styles/          # Global CSS and design tokens
|-- tests/               # Frontend tests
|-- AGENTS.md
`-- package.json
```

Do not import backend Python code or database logic. Communicate with the backend only through HTTP API contracts.

## Component Boundaries

Keep the board implementation split into focused components:

- Application shell: global header, workspace sidebar, main content frame, responsive behavior.
- Board toolbar: view tabs, search, visible count, unavailable controls, AI drawer trigger if colocated.
- Board canvas: horizontal scrolling and column layout.
- Board column: header, count, collapse control, droppable area, add-task action.
- Task card: title, optional metadata, cover variant, drag handle behavior, click target.
- Card editor: create and edit title, description, due date, and lightweight display metadata.
- AI drawer: chat history, message input, loading/error states, close behavior.
- Shared UI primitives: buttons, inputs, dialogs, drawers, badges, icon buttons, focus styles.

Do not place the complete board UI and behavior in one large component.

## Visual Conventions

Use the root `AGENTS.md` color palette as semantic tokens. Avoid repeated inline hex values.

The target visual direction is `docs/references/kanban-board-reference.png`, used only as development documentation. Match layout, density, spacing, hierarchy, and interaction patterns without copying branding, logos, user photos, text content, or proprietary artwork.

Required visual regions:

- Dark global header around 48-52 px high.
- Fixed desktop sidebar around 240-270 px wide.
- Main board toolbar with `List`, `Board`, and `Calendar` tabs.
- Horizontally scrollable board canvas.
- Four fixed status columns with subtle tinted backgrounds.
- Compact white cards with restrained borders, shadows, and metadata rows.
- Right-side AI drawer that preserves board context.

Keep the interface compact and work-focused. Avoid large hero layouts, decorative gradients, glassmorphism, excessive animation, and oversized rounded controls.

## Functional and Unavailable Controls

Functional in the MVP:

- Sign in and sign out.
- Board tab.
- Board search by card title and description.
- Column collapse and expand as presentation state.
- Fixed column rename.
- Create, open, edit, reorder, and move cards.
- AI drawer chat that can create, edit, and move cards after backend validation.

Visible but unavailable unless a later approved phase changes scope:

- List view.
- Calendar view.
- Additional spaces or pages.
- Inbox, home, more, add space, app grid, customize, and similar reference-style controls.

Unavailable controls must be disabled, labelled unavailable, or otherwise clearly non-functional.

## Accessibility

- Use semantic buttons and form controls.
- Provide accessible names for icon-only controls.
- Keep visible focus states for keyboard navigation.
- Do not rely on color alone to communicate status.
- Preserve readable contrast for text, icons, disabled states, and drag states.
- Provide keyboard-accessible card movement controls where supported by the chosen implementation.
- Avoid arbitrary sleeps in tests; wait for observable UI state.

## State and API Rules

- Keep backend communication in one centralized API client under `src/lib` or a focused feature API module.
- Use shared TypeScript contracts from `packages/types` for frontend-facing API shapes.
- Store only presentation preferences, such as collapsed columns, in browser storage when useful.
- Persist board data through backend APIs.
- Prefer canonical board refresh after mutations unless an optimistic path has explicit rollback behavior.
- Render AI text safely and never insert unsanitized HTML.
