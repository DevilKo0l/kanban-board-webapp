"use client";

import { useMemo, useState } from "react";
import type { BoardCard, BoardColumn } from "@kanban/types";
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
import {
  cardsForColumn,
  createCard,
  filterCards,
  moveCardFromDrag,
  moveCardRelative,
  sortColumns,
  updateCard,
} from "@/features/board/lib/board-operations";
import type { CardDraft } from "@/features/board/lib/board-operations";
import { initialBoard } from "@/features/board/lib/board-data";

type EditorState =
  | { mode: "create"; column: BoardColumn }
  | { mode: "edit"; card: BoardCard; column: BoardColumn };

export function BoardExperience() {
  const [board, setBoard] = useState(initialBoard);
  const [query, setQuery] = useState("");
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(
    () => new Set(["col-review"]),
  );
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleCards = useMemo(() => filterCards(board.cards, query), [board.cards, query]);
  const columns = useMemo(() => sortColumns(board.columns), [board.columns]);

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

  const closeEditor = () => setEditor(null);

  const submitEditor = (draft: CardDraft) => {
    if (!editor) {
      return;
    }

    if (editor.mode === "create") {
      setBoard((current) => createCard(current, editor.column.id, draft));
    } else {
      setBoard((current) => updateCard(current, editor.card.id, draft));
    }
    closeEditor();
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setBoard((current) =>
      moveCardFromDrag(current, String(event.active.id), event.over ? String(event.over.id) : null),
    );
  };

  return (
    <div className="h-screen overflow-hidden bg-white">
      <GlobalHeader onOpenAi={() => setAiOpen(true)} />
      <div className="flex h-[calc(100vh-50px)] min-h-0">
        <WorkspaceSidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <BoardToolbar
            query={query}
            onQueryChange={setQuery}
            visibleCount={visibleCards.length}
            totalCount={board.cards.length}
          />
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
                  onAddCard={(targetColumn) =>
                    setEditor({ mode: "create", column: targetColumn })
                  }
                  onEditCard={(card) => setEditor({ mode: "edit", card, column })}
                  onMoveCard={(cardId, direction) =>
                    setBoard((current) => moveCardRelative(current, cardId, direction))
                  }
                />
              ))}
            </div>
          </DndContext>
        </main>
      </div>
      <AiDrawer open={aiOpen} onClose={() => setAiOpen(false)} />
      {editor?.mode === "create" ? (
        <CardEditor
          mode={editor.mode}
          columnName={editor.column.name}
          onClose={closeEditor}
          onSubmit={submitEditor}
        />
      ) : null}
      {editor?.mode === "edit" ? (
        <CardEditor
          mode={editor.mode}
          card={editor.card}
          columnName={editor.column.name}
          onClose={closeEditor}
          onSubmit={submitEditor}
        />
      ) : null}
    </div>
  );
}
