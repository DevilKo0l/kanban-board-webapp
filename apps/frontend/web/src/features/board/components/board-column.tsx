import type { BoardCard, BoardColumn as BoardColumnType } from "@kanban/types";
import { ChevronLeft, ChevronRight, Circle, Pencil, Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { TaskCard } from "@/features/board/components/task-card";
import { classNames } from "@/lib/class-names";

type BoardColumnProps = {
  cards: BoardCard[];
  column: BoardColumnType;
  collapsed: boolean;
  highlightedCardIds?: Set<string>;
  onAddCard: (column: BoardColumnType) => void;
  onEditCard: (card: BoardCard) => void;
  onMoveCard: (cardId: string, direction: "left" | "right" | "up" | "down") => void;
  onRenameColumn: (column: BoardColumnType) => void;
  onToggleCollapse: (columnId: string) => void;
};

const statusStyles: Record<
  BoardColumnType["statusKey"],
  { background: string; dot: string; label: string; text: string }
> = {
  todo: {
    background: "bg-[var(--color-todo-bg)]",
    dot: "border-[var(--color-muted)]",
    label: "bg-[var(--color-todo-label)]",
    text: "text-[var(--color-muted)]",
  },
  in_progress: {
    background: "bg-[var(--color-progress-bg)]",
    dot: "border-[var(--color-progress-dot)]",
    label: "bg-[var(--color-progress-label)]",
    text: "text-[var(--color-progress-text)]",
  },
  in_review: {
    background: "bg-[var(--color-review-bg)]",
    dot: "border-[var(--color-review-yellow)]",
    label: "bg-[var(--color-review-label)]",
    text: "text-[var(--color-review-yellow)]",
  },
  closed: {
    background: "bg-[var(--color-closed-bg)]",
    dot: "border-[var(--color-closed-green)] bg-[var(--color-closed-green)]",
    label: "bg-[var(--color-closed-label)]",
    text: "text-[var(--color-closed-green)]",
  },
};

export function BoardColumn({
  cards,
  column,
  collapsed,
  highlightedCardIds,
  onAddCard,
  onEditCard,
  onMoveCard,
  onRenameColumn,
  onToggleCollapse,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });
  const styles = statusStyles[column.statusKey];

  if (collapsed) {
    return (
      <section
        className={classNames(
          "flex min-h-[620px] w-11 shrink-0 flex-col items-center rounded-md py-2",
          styles.background,
          isOver && "ring-2 ring-[var(--color-active-purple)]",
        )}
        ref={setNodeRef}
        aria-label={`${column.name} collapsed column`}
      >
        <button
          type="button"
          onClick={() => onToggleCollapse(column.id)}
          className="mb-3 rounded p-1 text-[var(--color-review-yellow)] hover:bg-white/70"
          aria-label={`Expand ${column.name}`}
        >
          <ChevronRight aria-hidden="true" size={18} />
        </button>
        <div className="flex flex-1 items-start justify-center">
          <div className="vertical-rl flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-[var(--color-review-yellow)] [writing-mode:vertical-rl]">
            <span className="inline-block size-3 rounded-full border-2 border-current" aria-hidden="true" />
            {column.name}
            <span>{cards.length}</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={classNames(
        "flex max-h-full min-h-[620px] w-[318px] shrink-0 flex-col rounded-md p-3",
        styles.background,
        isOver && "ring-2 ring-[var(--color-active-purple)]",
      )}
      ref={setNodeRef}
      aria-label={`${column.name} column with ${cards.length} cards`}
    >
      <header className="mb-3 flex items-center justify-between">
        <div className={classNames("inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-semibold", styles.label, styles.text)}>
          <Circle aria-hidden="true" size={16} className={styles.dot} />
          <span>{column.name}</span>
          <span aria-label={`${cards.length} cards`}>{cards.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onRenameColumn(column)}
            className="rounded p-1 text-[var(--color-muted)] hover:bg-white/70"
            aria-label={`Rename ${column.name}`}
          >
            <Pencil aria-hidden="true" size={15} />
          </button>
          <button
            type="button"
            onClick={() => onToggleCollapse(column.id)}
            className="rounded p-1 text-[var(--color-muted)] hover:bg-white/70"
            aria-label={`Collapse ${column.name}`}
          >
            <ChevronLeft aria-hidden="true" size={17} />
          </button>
        </div>
      </header>
      <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
        <div className="scrollbar-soft flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-3">
          {cards.length > 0 ? (
            cards.map((card) => (
              <TaskCard
                key={card.id}
                card={card}
                highlighted={highlightedCardIds?.has(card.id) ?? false}
                onEdit={onEditCard}
                onMove={onMoveCard}
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-[var(--color-border)] bg-white/65 p-4 text-sm text-[var(--color-muted)]">
              No visible tasks
            </div>
          )}
        </div>
      </SortableContext>
      <button
        type="button"
        onClick={() => onAddCard(column)}
        className="mt-auto flex items-center gap-2 rounded-md px-3 py-3 text-left text-sm font-medium text-[var(--color-muted)] hover:bg-white/60"
      >
        <Plus aria-hidden="true" size={18} />
        Add task
      </button>
    </section>
  );
}
