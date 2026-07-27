# Phase 3 Report

## Scope

Phase 3 built the frontend-only application shell and local Kanban board UI. Board data is temporary client state in this phase; authentication, backend persistence, SQLite board APIs, and real AI actions remain later phases.

## What Changed

- Scaffolded the Next.js App Router app in `apps/frontend/web`.
- Added Tailwind CSS, shared CSS design tokens, Lucide icons, `dnd-kit`, ESLint, TypeScript checks, Vitest, and Testing Library.
- Expanded `packages/types` with frontend-facing board contracts consumed by the web app.
- Built a dark global header, desktop workspace sidebar, board toolbar, horizontally scrollable board canvas, four fixed status columns, compact task cards, local card cover assets, card editor dialog, and AI preview drawer.
- Added local demo board data inspired by `docs/references/kanban-board-reference.png` without copying branding, names, people, or proprietary assets.
- Added client-side search, column collapse, card creation, card editing, drag-and-drop movement, deterministic ordering helpers, and keyboard move buttons.
- Added focused frontend tests for shell rendering, search, column collapse, card creation/editing, AI drawer visibility, and board movement helpers.

## Visual Decisions

- Preserved the approved desktop-first density: 50 px dark header, 252 px sidebar, compact toolbar, fixed-width columns, and horizontal overflow.
- Kept unsupported controls visibly disabled: global search, List, Calendar, Add view, Customize, New, app grid, notifications, workspace destinations, and extra spaces.
- Kept status color treatment in shared CSS tokens and local SVG cover assets under `apps/frontend/web/public/covers`.
- Started `In Review` collapsed as a presentation preference only.

## Validation

All validation used Dockerized Node `22.14.0` because the host Node runtime is `v16.13.1`, which is too old for this Next.js scaffold.

- `docker run --rm -v "${PWD}:/workspace" -w /workspace node:22.14.0-bookworm npm --workspace=@kanban/types run check` passed.
- `docker run --rm -v "${PWD}:/workspace" -w /workspace node:22.14.0-bookworm npm --workspace=@kanban/types run build` passed.
- `docker run --rm -v "${PWD}:/workspace" -w /workspace node:22.14.0-bookworm npm --workspace=@kanban/web run check` passed.
- `docker run --rm -v "${PWD}:/workspace" -w /workspace node:22.14.0-bookworm npm --workspace=@kanban/web run lint` passed.
- `docker run --rm -v "${PWD}:/workspace" -w /workspace node:22.14.0-bookworm npm --workspace=@kanban/web run test` passed with 2 files and 10 tests.
- `docker run --rm -v "${PWD}:/workspace" -w /workspace node:22.14.0-bookworm npm --workspace=@kanban/web run build` passed and statically generated `/` and `/_not-found`.
- Browser smoke against `http://localhost:3000/` passed after a fresh preview start: title `Project Board`, 50 px header, 252 px sidebar, active Board tab, 12 of 12 visible count, To Do/In Progress/In Review collapsed/Closed regions, horizontal board overflow, and no console warnings or errors.

## Notes and Risks

- `npm audit fix --workspace=@kanban/web` ran and applied safe dependency lockfile changes, but `npm audit --workspace=@kanban/web --audit-level=high` still reports 12 high-severity transitive advisories. The remaining fixes require breaking changes according to npm: ESLint 10 for the `brace-expansion` chain and a forced Next downgrade for the current Next/PostCSS/sharp advisory chain. I did not force either change because it would destabilize or break the approved scaffold.
- The Dockerized Next dev server reports a slow-filesystem warning when serving from the mounted Windows workspace. This affects local dev performance, not the production build result.
- The temporary frontend preview container was stopped after validation. The backend container on `http://localhost:8000` was left running.
