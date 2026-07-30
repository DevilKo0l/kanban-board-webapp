"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BoardCard, BoardColumn, BoardState } from "@kanban/types";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { GlobalHeader } from "@/components/app-shell/global-header";
import { WorkspaceSidebar } from "@/components/app-shell/workspace-sidebar";
import { AiDrawer } from "@/features/board/components/ai-drawer";
import { BoardColumn as BoardColumnView } from "@/features/board/components/board-column";
import { BoardToolbar } from "@/features/board/components/board-toolbar";
import { CardEditor } from "@/features/board/components/card-editor";
import { ColumnRenameDialog } from "@/features/board/components/column-rename-dialog";
import {
  createCard,
  getBoard,
  moveCard,
  renameColumn,
  updateCard,
} from "@/features/board/lib/board-api";
import type { CardDraft } from "@/features/board/lib/board-api";
import {
  cardsForColumn,
  filterCards,
  getMoveIntentFromDrag,
  getMoveIntentRelative,
  sortColumns,
} from "@/features/board/lib/board-operations";
import type { MoveDirection, MoveIntent } from "@/features/board/lib/board-operations";
import { ApiError } from "@/lib/api-client";

type EditorState =
  | { mode: "create"; column: BoardColumn }
  | { mode: "edit"; card: BoardCard; column: BoardColumn };

type BoardLoadState = "error" | "loading" | "ready";

type BoardExperienceProps = {
  onLogout?: () => void;
  username?: string;
};

export function BoardExperience({ onLogout, username = "user" }: BoardExperienceProps) {
  const [board, setBoard] = useState<BoardState | null>(null);
  const [loadState, setLoadState] = useState<BoardLoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(
    () => new Set(["col-review"]),
  );
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [renamingColumn, setRenamingColumn] = useState<BoardColumn | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleCards = useMemo(() => filterCards(board?.cards ?? [], query), [board?.cards, query]);
  const columns = useMemo(() => sortColumns(board?.columns ?? []), [board?.columns]);

  const refreshBoard = useCallback(async () => {
    const nextBoard = await getBoard();
    setBoard(nextBoard);
    setLoadState("ready");
    setLoadError(null);
    return nextBoard;
  }, []);

  const loadBoard = useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    try {
      await refreshBoard();
    } catch (error) {
      setLoadState("error");
      setLoadError(getErrorMessage(error, "Board data could not be loaded."));
    }
  }, [refreshBoard]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const toggleColumn = (columnId: string) => {
    setCollapsedColumns((current) => {
      const next = new Set(current);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  const closeEditor = () => {
    if (!submitting) {
      setEditor(null);
      setEditorError(null);
    }
  };

  const submitEditor = async (draft: CardDraft) => {
    if (!editor) {
      return;
    }

    setSubmitting(true);
    setEditorError(null);
    setMutationError(null);
    try {
      if (editor.mode === "create") {
        await createCard({
          columnId: editor.column.id,
          title: draft.title.trim(),
          description: draft.description?.trim() || null,
          dueDate: draft.dueDate || null,
        });
      } else {
        await updateCard(editor.card.id, {
          title: draft.title.trim(),
          description: draft.description?.trim() || null,
          dueDate: draft.dueDate || null,
        });
      }
      await refreshBoard();
      setEditor(null);
    } catch (error) {
      setEditorError(getErrorMessage(error, "Task could not be saved."));
    } finally {
      setSubmitting(false);
    }
  };

  const submitRename = async (name: string) => {
    if (!renamingColumn) {
      return;
    }

    setSubmitting(true);
    setRenameError(null);
    setMutationError(null);
    try {
      await renameColumn(renamingColumn.id, { name: name.trim() });
      await refreshBoard();
      setRenamingColumn(null);
    } catch (error) {
      setRenameError(getErrorMessage(error, "Column name could not be saved."));
    } finally {
      setSubmitting(false);
    }
  };

  const persistMove = async (cardId: string, intent: MoveIntent | null) => {
    if (!intent) {
      return;
    }

    setSubmitting(true);
    setMutationError(null);
    try {
      const nextBoard = await moveCard(cardId, intent);
      setBoard(nextBoard);
      setLoadState("ready");
    } catch (error) {
      setMutationError(getErrorMessage(error, "Task move could not be saved."));
      try {
        await refreshBoard();
      } catch {
        setLoadState("error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!board || submitting) {
      return;
    }

    void persistMove(
      String(event.active.id),
      getMoveIntentFromDrag(
        board,
        String(event.active.id),
        event.over ? String(event.over.id) : null,
      ),
    );
  };

  const handleMoveCard = (cardId: string, direction: MoveDirection) => {
    if (!board || submitting) {
      return;
    }

    void persistMove(cardId, getMoveIntentRelative(board, cardId, direction));
  };

  return (
    <div className="h-screen overflow-hidden bg-white">
      <GlobalHeader onLogout={onLogout} onOpenAi={() => setAiOpen(true)} username={username} />
      <div className="flex h-[calc(100vh-50px)] min-h-0">
        <WorkspaceSidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <BoardToolbar
            query={query}
            onQueryChange={setQuery}
            visibleCount={visibleCards.length}
            totalCount={board?.cards.length ?? 0}
          />
          {mutationError ? <BoardNotice message={mutationError} /> : null}
          {loadState === "loading" && board ? <BoardNotice message="Refreshing board..." /> : null}
          {board ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragEnd={handleDragEnd}
            >
              <div
                className="scrollbar-soft flex flex-1 gap-5 overflow-x-auto px-5 py-10 md:px-8"
                aria-label="Kanban board"
              >
                {columns.map((column) => (
                  <BoardColumnView
                    key={column.id}
                    column={column}
                    cards={cardsForColumn(visibleCards, column.id)}
                    collapsed={collapsedColumns.has(column.id)}
                    onToggleCollapse={toggleColumn}
                    onAddCard={(targetColumn) => {
                      setEditorError(null);
                      setEditor({ mode: "create", column: targetColumn });
                    }}
                    onEditCard={(card) => {
                      setEditorError(null);
                      setEditor({ mode: "edit", card, column });
                    }}
                    onMoveCard={handleMoveCard}
                    onRenameColumn={(targetColumn) => {
                      setRenameError(null);
                      setRenamingColumn(targetColumn);
                    }}
                  />
                ))}
              </div>
            </DndContext>
          ) : (
            <div className="scrollbar-soft flex flex-1 gap-5 overflow-x-auto px-5 py-10 md:px-8">
              {loadState === "error" ? (
                <BoardErrorState
                  message={loadError ?? "Board data could not be loaded."}
                  onRetry={loadBoard}
                />
              ) : (
                <BoardLoadingState />
              )}
            </div>
          )}
        </main>
      </div>
      <AiDrawer open={aiOpen} onClose={() => setAiOpen(false)} />
      {editor?.mode === "create" ? (
        <CardEditor
          mode={editor.mode}
          columnName={editor.column.name}
          onClose={closeEditor}
          onSubmit={submitEditor}
          error={editorError}
          submitting={submitting}
        />
      ) : null}
      {editor?.mode === "edit" ? (
        <CardEditor
          mode={editor.mode}
          card={editor.card}
          columnName={editor.column.name}
          onClose={closeEditor}
          onSubmit={submitEditor}
          error={editorError}
          submitting={submitting}
        />
      ) : null}
      {renamingColumn ? (
        <ColumnRenameDialog
          column={renamingColumn}
          error={renameError}
          onClose={() => {
            if (!submitting) {
              setRenamingColumn(null);
              setRenameError(null);
            }
          }}
          onSubmit={submitRename}
          submitting={submitting}
        />
      ) : null}
    </div>
  );
}

function BoardLoadingState() {
  return (
    <div className="flex gap-5" aria-label="Loading board">
      {["To Do", "In Progress", "In Review", "Closed"].map((label) => (
        <section
          key={label}
          className="flex min-h-[620px] w-[318px] shrink-0 flex-col rounded-md bg-[var(--color-todo-bg)] p-3"
        >
          <div className="mb-4 h-9 w-32 rounded-md bg-white/75" />
          <div className="space-y-3">
            <div className="h-32 rounded-md border border-[var(--color-border)] bg-white" />
            <div className="h-28 rounded-md border border-[var(--color-border)] bg-white" />
          </div>
        </section>
      ))}
    </div>
  );
}

function BoardErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="grid min-h-[360px] w-full place-items-center" aria-label="Board load error">
      <div className="max-w-md rounded-md border border-[var(--color-border)] bg-white p-5 text-center shadow-[var(--shadow-card)]">
        <h2 className="text-base font-semibold">Board unavailable</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md bg-[var(--color-active-purple)] px-4 py-2 text-sm font-semibold text-white"
        >
          Retry
        </button>
      </div>
    </section>
  );
}

function BoardNotice({ message }: { message: string }) {
  return (
    <div
      className="border-b border-[var(--color-border)] bg-[var(--color-active-purple-bg)] px-5 py-2 text-sm font-medium text-[var(--color-active-purple)] md:px-8"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }
  return fallback;
}
